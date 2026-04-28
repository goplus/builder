import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUnmounted } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Cancelled } from '@/utils/exception'
import { provideLayerStack } from '../utils/layer-stack'
import UIModalProvider, { useModal, useModalEvents } from './UIModalProvider.vue'

async function flushModalProvider() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function getByTestId(testId: string) {
  return document.body.querySelector(`[data-test-id="${testId}"]`) as HTMLElement | null
}

function getActiveState(testId: string) {
  return getByTestId(testId)?.getAttribute('data-active') ?? null
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
        return () => h(component)
      }
    }),
    { attachTo: document.body }
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

  it('passes active only to the topmost modal', async () => {
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

    const alphaPromise = openModal({ label: 'alpha' })
    await flushModalProvider()

    expect(getActiveState('alpha')).toBe('true')

    const betaPromise = openModal({ label: 'beta' })
    await flushModalProvider()

    expect(getActiveState('alpha')).toBe('false')
    expect(getActiveState('beta')).toBe('true')

    await clickByTestId('beta-resolve')
    await flushModalProvider()
    await expect(betaPromise).resolves.toBe('beta')

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()

    expect(getActiveState('alpha')).toBe('true')

    await clickByTestId('alpha-resolve')
    await flushModalProvider()
    await expect(alphaPromise).resolves.toBe('alpha')

    await vi.advanceTimersByTimeAsync(300)
    await flushModalProvider()
    expect(getByTestId('alpha')).toBeNull()
  })
})
