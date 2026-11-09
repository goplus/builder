import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUnmounted, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Cancelled } from '@/utils/exception'
import { useProvideLastClickEvent } from '../utils'
import { provideLayerStack } from '../utils/layer-stack'
import UIModal from './UIModal.vue'
import UIModalProvider, { useModal, useModalEvents } from './UIModalProvider.vue'

async function flushModalProvider() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function getByTestId(testId: string) {
  return document.body.querySelector(`[data-test-id="${testId}"]`) as HTMLElement | null
}

async function clickByTestId(testId: string) {
  const element = getByTestId(testId)
  expect(element).toBeInstanceOf(HTMLElement)
  await new DOMWrapper(element as HTMLElement).trigger('click')
}

const mountedWrappers: VueWrapper[] = []

function mountWithModalProvider(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(
    defineComponent({
      setup() {
        provideLayerStack()
        useProvideLastClickEvent()
        return () => h(component)
      }
    }),
    { attachTo: document.body, global: { directives: { radar: () => null } } }
  )
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
      h(
        UIModal,
        {
          visible: props.visible,
          'data-test-id': props.label,
          'onUpdate:visible': () => emit('cancelled', props.label)
        },
        {
          default: () => [
            h(
              'button',
              { 'data-test-id': `${props.label}-resolve`, onClick: () => emit('resolved', props.label) },
              'Resolve'
            ),
            h(
              'button',
              { 'data-test-id': `${props.label}-cancel`, onClick: () => emit('cancelled', props.label) },
              'Cancel'
            )
          ]
        }
      )
  }
})

function mountCancellableModal() {
  let openModal!: (props: { label: string }, options?: { signal?: AbortSignal }) => Promise<unknown>
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
  return (signal: AbortSignal) => openModal({ label: 'cancellable' }, { signal })
}

describe('UIModalProvider', () => {
  it.each([false, true])('cancels before or after becoming visible (visible: %s)', async (visible) => {
    vi.useFakeTimers()
    const open = mountCancellableModal()
    const controller = new AbortController()
    const result = open(controller.signal)
    const cancelled = expect(result).rejects.toBeInstanceOf(Cancelled)
    if (visible) await flushModalProvider()
    controller.abort()
    await cancelled
    await flushModalProvider()
    expect(getByTestId('cancellable')).toBeNull()
    await vi.advanceTimersByTimeAsync(300)
    expect(getByTestId('cancellable')).toBeNull()
  })

  it('cancels pending modals and removes abort listeners when the provider unmounts', async () => {
    vi.useFakeTimers()
    const open = mountCancellableModal()
    const controller = new AbortController()
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
    const result = open(controller.signal)
    const cancelled = expect(result).rejects.toBeInstanceOf(Cancelled)
    await flushModalProvider()
    mountedWrappers.pop()!.unmount()
    await cancelled
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
    await vi.advanceTimersByTimeAsync(300)
  })

  it('removes the abort listener after resolving normally', async () => {
    vi.useFakeTimers()
    const open = mountCancellableModal()
    const controller = new AbortController()
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
    const result = open(controller.signal)
    await flushModalProvider()
    await clickByTestId('cancellable-resolve')
    await expect(result).resolves.toBe('cancellable')
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
    controller.abort()
    await expect(result).resolves.toBe('cancellable')
  })

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
    expect(getByTestId('alpha')).toBeInstanceOf(HTMLElement)

    await clickByTestId('alpha-resolve')
    await flushModalProvider()

    await expect(modalPromise).resolves.toBe('alpha')
    expect(eventLog).toEqual(['open', 'resolved'])

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    expect(getByTestId('alpha')).toBeNull()
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

    await clickByTestId('beta-cancel')
    await flushModalProvider()

    await expect(modalPromise).rejects.toEqual(new Cancelled('beta'))
    expect(eventLog).toEqual(['open', 'cancelled'])

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    expect(getByTestId('beta')).toBeNull()
  })

  it.each(['programmatic', 'direct'] as const)(
    'closes only the topmost %s modal and lets the underlying modal handle the next Escape',
    async (topModalKind) => {
      vi.useFakeTimers()
      let openModal!: (props: { label: string }) => Promise<unknown>
      const directVisible = ref(false)
      const Consumer = defineComponent({
        setup() {
          openModal = useModal(ProgrammaticModal as any)
          return () =>
            directVisible.value
              ? h(UIModal, {
                  visible: true,
                  'data-test-id': 'direct',
                  'onUpdate:visible': () => (directVisible.value = false)
                })
              : null
        }
      })
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            return () => h(UIModalProvider, null, { default: () => h(Consumer) })
          }
        })
      )
      const alphaResult = openModal({ label: 'alpha' }).catch((error: unknown) => error)
      await flushModalProvider()

      let betaResult: Promise<unknown> | null = null
      if (topModalKind === 'programmatic') {
        betaResult = openModal({ label: 'beta' }).catch((error: unknown) => error)
      } else {
        directVisible.value = true
      }
      await flushModalProvider()
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushModalProvider()

      expect(getByTestId('alpha')).toBeInstanceOf(HTMLElement)
      if (betaResult != null) {
        expect(await betaResult).toEqual(new Cancelled('beta'))
        expect(wrapper.findAllComponents(ProgrammaticModal)).toHaveLength(2)
        expect(wrapper.findAllComponents(ProgrammaticModal)[1].props('visible')).toBe(false)
      } else {
        expect(directVisible.value).toBe(false)
      }

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushModalProvider()
      expect(await alphaResult).toEqual(new Cancelled('alpha'))
      await vi.advanceTimersByTimeAsync(300)
      await flushModalProvider()
      expect(wrapper.findAllComponents(ProgrammaticModal)).toHaveLength(0)
    }
  )
})
