import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UIMessageProvider, { useMessageEvents } from './UIMessageProvider.vue'
import { useMessage } from './index'
import { provideRootContainer } from '../utils'

async function flushMessage() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('ui message api regression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function mountMessageHarness() {
    const received: Array<{ type: 'info' | 'success' | 'warning' | 'error'; content: string }> = []
    let messageApi!: ReturnType<typeof useMessage>

    const RootContainerProvider = defineComponent({
      setup(_, { slots }) {
        const rootContainer = ref(document.body as HTMLElement)
        provideRootContainer(rootContainer)

        return () => slots.default?.()
      }
    })

    const Harness = defineComponent({
      setup() {
        messageApi = useMessage()
        const messageEvents = useMessageEvents()
        messageEvents.on('message', (event) => {
          received.push(event)
        })
        return () => h('div', { 'data-test-id': 'message-harness' })
      }
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(RootContainerProvider, null, {
              default: () =>
                h(UIMessageProvider, null, {
                  default: () => h(Harness)
                })
            })
        }
      }),
      {
        attachTo: document.body
      }
    )

    return {
      wrapper,
      messageApi,
      received
    }
  }

  it('throws when useMessageEvents is called outside UIMessageProvider', () => {
    const BrokenHarness = defineComponent({
      setup() {
        useMessageEvents()
        return () => h('div')
      }
    })

    expect(() => mount(BrokenHarness)).toThrow('useMessageEvents should be called inside of UIMessageProvider')
  })

  it('throws when useMessage is called outside UIMessageProvider', () => {
    const BrokenHarness = defineComponent({
      setup() {
        useMessage()
        return () => h('div')
      }
    })

    expect(() => mount(BrokenHarness)).toThrow('useMessage should be called inside of UIMessageProvider')
  })

  it.each([
    ['info', 'hello info'],
    ['success', 'hello success'],
    ['warning', 'hello warning'],
    ['error', 'hello error']
  ] as const)('renders and emits messageEvents for %s messages', async (type, content) => {
    const { messageApi, received } = mountMessageHarness()

    messageApi[type](content)
    await flushMessage()

    expect(received).toEqual([{ type, content }])
    expect(document.body.textContent).toContain(content)
  })

  it('automatically dismisses standard messages after the default duration', async () => {
    const { messageApi } = mountMessageHarness()

    messageApi.info('auto dismiss me')
    await flushMessage()
    expect(document.body.textContent).toContain('auto dismiss me')

    await vi.advanceTimersByTimeAsync(3000)
    await flushMessage()
    expect(document.body.textContent).not.toContain('auto dismiss me')
  })

  it('withLoading resolves the original promise result, shows a loading message while pending, and does not emit messageEvents', async () => {
    const { messageApi, received } = mountMessageHarness()

    const resultPromise = messageApi.withLoading(
      new Promise<string>((resolve) => {
        window.setTimeout(() => resolve('done'), 1200)
      }),
      'Loading message...'
    )

    await flushMessage()
    expect(received).toEqual([])
    expect(document.body.textContent).toContain('Loading message...')

    await vi.advanceTimersByTimeAsync(1200)
    await expect(resultPromise).resolves.toBe('done')
    await flushMessage()
    expect(document.body.textContent).not.toContain('Loading message...')
  })

  it('withLoading rethrows promise rejection, removes the loading message, and does not emit messageEvents', async () => {
    const { messageApi, received } = mountMessageHarness()
    const error = new Error('load failed')

    const resultPromise = messageApi.withLoading(
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(error), 1200)
      }),
      'Loading message...'
    )
    const rejectionAssertion = expect(resultPromise).rejects.toThrow(error)

    await flushMessage()
    expect(received).toEqual([])
    expect(document.body.textContent).toContain('Loading message...')

    await vi.advanceTimersByTimeAsync(1200)
    await rejectionAssertion
    await flushMessage()
    expect(document.body.textContent).not.toContain('Loading message...')
  })
})
