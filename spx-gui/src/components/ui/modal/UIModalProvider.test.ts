import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUnmounted } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Cancelled } from '@/utils/exception'
import { getPopupRootAttrs } from '../popup'
import UIModalProvider, { useModal, useModalEvents, useModalEsc } from './UIModalProvider.vue'

async function flushModalProvider() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mountedWrappers: VueWrapper[] = []

function mountWithModalProvider(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const ProgrammaticModal = defineComponent({
  name: 'ProgrammaticModalTestDouble',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    active: Boolean,
    label: {
      type: String,
      required: true
    }
  },
  emits: {
    resolved: (_resolved: string) => true,
    cancelled: (_reason?: unknown) => true
  },
  setup(props, { emit }) {
    return () =>
      props.visible
        ? h('div', { 'data-test-id': props.label, 'data-active': String(props.active ?? false) }, [
            h(
              'button',
              {
                'data-test-id': `${props.label}-resolve`,
                onClick: () => emit('resolved', props.label)
              },
              'Resolve'
            ),
            h(
              'button',
              {
                'data-test-id': `${props.label}-cancel`,
                onClick: () => emit('cancelled', props.label)
              },
              'Cancel'
            )
          ])
        : null
  }
})

const EscAwareModal = defineComponent({
  name: 'EscAwareModalTestDouble',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    active: Boolean,
    label: {
      type: String,
      required: true
    }
  },
  emits: {
    resolved: (_resolved: string) => true,
    cancelled: (_reason?: unknown) => true
  },
  setup(props, { emit }) {
    useModalEsc(
      () => props.active ?? false,
      () => emit('cancelled', `${props.label}-esc`)
    )

    return () =>
      props.visible
        ? h('div', { 'data-test-id': props.label, 'data-active': String(props.active ?? false) }, [
            h('button', { 'data-test-id': `${props.label}-inside` }, 'Inside')
          ])
        : null
  }
})

const EscAwareModalWithNestedPopup = defineComponent({
  name: 'EscAwareModalWithNestedPopupTestDouble',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    active: Boolean,
    label: {
      type: String,
      required: true
    }
  },
  emits: {
    resolved: (_resolved: string) => true,
    cancelled: (_reason?: unknown) => true
  },
  setup(props, { emit }) {
    useModalEsc(
      () => props.active ?? false,
      () => emit('cancelled', `${props.label}-esc`)
    )

    const nestedPopupAttrs = getPopupRootAttrs(9999, 'dropdown')

    return () =>
      props.visible
        ? h('div', { 'data-test-id': props.label, 'data-active': String(props.active ?? false) }, [
            h('button', { 'data-test-id': `${props.label}-inside` }, 'Inside'),
            h('div', { ...nestedPopupAttrs }, [h('button', { 'data-test-id': `${props.label}-popup` }, 'Popup')])
          ])
        : null
  }
})

describe('UIModalProvider', () => {
  it('opens modals programmatically, resolves results, and emits lifecycle events', async () => {
    vi.useFakeTimers()

    let openModal!: (props: { label: string }) => Promise<unknown>
    const eventLog: string[] = []

    const Consumer = defineComponent({
      setup() {
        openModal = useModal(ProgrammaticModal as any)
        const events = useModalEvents()
        const offs = [
          events.on('open', () => eventLog.push('open')),
          events.on('resolved', () => eventLog.push('resolved')),
          events.on('cancelled', () => eventLog.push('cancelled'))
        ]
        onUnmounted(() => offs.forEach((off) => off()))
        return () => null
      }
    })

    mountWithModalProvider(
      defineComponent({
        setup() {
          return () => h(UIModalProvider, null, { default: () => h(Consumer) })
        }
      })
    )

    const modalPromise = openModal({ label: 'alpha' })
    await flushModalProvider()

    expect(eventLog).toEqual(['open'])
    expect(document.body.querySelector('[data-test-id="alpha"]')).toBeInstanceOf(HTMLElement)

    await new DOMWrapper(document.body.querySelector('[data-test-id="alpha-resolve"]') as HTMLElement).trigger('click')
    await flushModalProvider()

    await expect(modalPromise).resolves.toBe('alpha')
    expect(eventLog).toEqual(['open', 'resolved'])

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    expect(document.body.querySelector('[data-test-id="alpha"]')).toBeNull()
  })

  it('rejects cancelled modals with Cancelled and emits cancelled events', async () => {
    vi.useFakeTimers()

    let openModal!: (props: { label: string }) => Promise<unknown>
    const eventLog: string[] = []

    const Consumer = defineComponent({
      setup() {
        openModal = useModal(ProgrammaticModal as any)
        const events = useModalEvents()
        const offs = [
          events.on('open', () => eventLog.push('open')),
          events.on('resolved', () => eventLog.push('resolved')),
          events.on('cancelled', () => eventLog.push('cancelled'))
        ]
        onUnmounted(() => offs.forEach((off) => off()))
        return () => null
      }
    })

    mountWithModalProvider(
      defineComponent({
        setup() {
          return () => h(UIModalProvider, null, { default: () => h(Consumer) })
        }
      })
    )

    const modalPromise = openModal({ label: 'beta' })
    await flushModalProvider()

    await new DOMWrapper(document.body.querySelector('[data-test-id="beta-cancel"]') as HTMLElement).trigger('click')
    await flushModalProvider()

    await expect(modalPromise).rejects.toEqual(new Cancelled('beta'))
    expect(eventLog).toEqual(['open', 'cancelled'])

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    expect(document.body.querySelector('[data-test-id="beta"]')).toBeNull()
  })

  it('passes active only to the topmost modal in the provider stack', async () => {
    vi.useFakeTimers()

    let openModal!: (props: { label: string }) => Promise<unknown>

    const Consumer = defineComponent({
      setup() {
        openModal = useModal(ProgrammaticModal as any)
        return () => null
      }
    })

    mountWithModalProvider(
      defineComponent({
        setup() {
          return () => h(UIModalProvider, null, { default: () => h(Consumer) })
        }
      })
    )

    void openModal({ label: 'first' }).catch(() => undefined)
    await flushModalProvider()
    void openModal({ label: 'second' }).catch(() => undefined)
    await flushModalProvider()

    expect((document.body.querySelector('[data-test-id="first"]') as HTMLElement).dataset.active).toBe('false')
    expect((document.body.querySelector('[data-test-id="second"]') as HTMLElement).dataset.active).toBe('true')
  })

  it('closes only the topmost ESC-aware modal for ESC events inside the modal scope', async () => {
    vi.useFakeTimers()

    let openModal!: (props: { label: string }) => Promise<unknown>

    const Consumer = defineComponent({
      setup() {
        openModal = useModal(EscAwareModal as any)
        return () => h('button', { 'data-test-id': 'outside' }, 'Outside')
      }
    })

    mountWithModalProvider(
      defineComponent({
        setup() {
          return () => h(UIModalProvider, null, { default: () => h(Consumer) })
        }
      })
    )

    const firstPromise = openModal({ label: 'first' })
    await flushModalProvider()
    const secondPromise = openModal({ label: 'second' })
    await flushModalProvider()
    ;(document.body.querySelector('[data-test-id="outside"]') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flushModalProvider()
    expect(document.body.querySelector('[data-test-id="first"]')).toBeInstanceOf(HTMLElement)
    expect(document.body.querySelector('[data-test-id="second"]')).toBeInstanceOf(HTMLElement)
    ;(document.body.querySelector('[data-test-id="second-inside"]') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flushModalProvider()

    await expect(secondPromise).rejects.toEqual(new Cancelled('second-esc'))
    expect(document.body.querySelector('[data-test-id="first"]')).toBeInstanceOf(HTMLElement)

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    ;(document.body.querySelector('[data-test-id="first-inside"]') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flushModalProvider()

    await expect(firstPromise).rejects.toEqual(new Cancelled('first-esc'))
  })

  it('does not close the modal when ESC originates from nested popup content', async () => {
    vi.useFakeTimers()

    let openModal!: (props: { label: string }) => Promise<unknown>

    const Consumer = defineComponent({
      setup() {
        openModal = useModal(EscAwareModalWithNestedPopup as any)
        return () => null
      }
    })

    mountWithModalProvider(
      defineComponent({
        setup() {
          return () => h(UIModalProvider, null, { default: () => h(Consumer) })
        }
      })
    )

    const modalPromise = openModal({ label: 'popup-owner' })
    await flushModalProvider()
    ;(document.body.querySelector('[data-test-id="popup-owner-popup"]') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flushModalProvider()

    expect(document.body.querySelector('[data-test-id="popup-owner"]')).toBeInstanceOf(HTMLElement)

    await new DOMWrapper(document.body.querySelector('[data-test-id="popup-owner-inside"]') as HTMLElement).trigger(
      'click'
    )
    ;(document.body.querySelector('[data-test-id="popup-owner-inside"]') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await flushModalProvider()

    await expect(modalPromise).rejects.toEqual(new Cancelled('popup-owner-esc'))
  })
})
