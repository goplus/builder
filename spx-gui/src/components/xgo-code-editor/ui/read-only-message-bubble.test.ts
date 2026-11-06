import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, shallowRef, type EffectScope, type Ref } from 'vue'
import type { MonacoEditor } from '../monaco'
import { useReadOnlyMessageBubble } from './read-only-message-bubble'

describe('read-only message bubble', () => {
  let scope: EffectScope
  let readOnly: Ref<boolean>
  let editorEl: HTMLElement
  let widgetContainer: HTMLElement
  let notifyResize: ResizeObserverCallback
  let observe: ReturnType<typeof vi.fn>
  let disconnect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scope = effectScope()
    readOnly = ref(true)
    editorEl = document.createElement('div')
    editorEl.innerHTML = '<div class="view-lines"></div><div class="overflowingContentWidgets"></div>'
    widgetContainer = editorEl.querySelector<HTMLElement>('.overflowingContentWidgets')!
    observe = vi.fn()
    disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notifyResize = callback
        }
        observe = observe
        disconnect = disconnect
      }
    )
  })

  afterEach(() => {
    scope.stop()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function start() {
    const editor = shallowRef({ getDomNode: () => editorEl } as MonacoEditor)
    scope.run(() => useReadOnlyMessageBubble(editor, readOnly))
  }

  function showMessage() {
    const message = document.createElement('div')
    message.className = 'monaco-editor-overlaymessage'
    message.innerHTML = '<div class="message">Stop the run before editing code</div>'
    widgetContainer.append(message)
    return message
  }

  function resize(width: number, height: number) {
    notifyResize(
      [{ borderBoxSize: [{ inlineSize: width, blockSize: height }] }] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver
    )
  }

  it('decorates a blocked-edit message and adapts the outline when its size changes', async () => {
    start()
    const message = showMessage()
    await vi.waitFor(() => expect(message.querySelectorAll('svg')).toHaveLength(1))
    expect(observe).toHaveBeenLastCalledWith(message)
    const bubble = message.querySelector('svg')!
    expect(bubble.getAttribute('aria-hidden')).toBe('true')
    expect(message.textContent).toBe('Stop the run before editing code')

    resize(194, 47)
    expect(bubble.getAttribute('viewBox')).toBe('0 0 194 47')
    const initialPath = bubble.querySelector('path')!.getAttribute('d')
    expect(initialPath).toMatch(/Z$/)
    resize(320, 68)
    expect(bubble.getAttribute('viewBox')).toBe('0 0 320 68')
    expect(bubble.querySelector('path')!.getAttribute('d')).not.toBe(initialPath)
    notifyResize([{ borderBoxSize: [] }] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
    expect(bubble.getAttribute('viewBox')).toBe('0 0 320 68')
  })

  it('skips message lookups during code rendering and nested widget updates', async () => {
    const message = showMessage()
    start()
    const lookup = vi.spyOn(widgetContainer, 'querySelector')
    const codeMutations = vi.fn()
    const renderingObserver = new MutationObserver(codeMutations)
    renderingObserver.observe(editorEl, { childList: true, subtree: true })
    try {
      editorEl.querySelector('.view-lines')!.append(document.createElement('span'))
      message.querySelector('.message')!.textContent = '请先停止运行，再修改代码'
      await vi.waitFor(() => expect(codeMutations).toHaveBeenCalled())
      expect(lookup).not.toHaveBeenCalled()
      expect(message.querySelectorAll('svg')).toHaveLength(1)
    } finally {
      renderingObserver.disconnect()
    }
  })

  it('replaces the decoration on repeated attempts and cleans it up on dismissal', async () => {
    start()
    const first = showMessage()
    await vi.waitFor(() => expect(first.querySelector('svg')).not.toBeNull())
    first.remove()
    const second = showMessage()
    await vi.waitFor(() => expect(second.querySelector('svg')).not.toBeNull())
    expect(first.querySelector('svg')).toBeNull()
    expect(widgetContainer.querySelectorAll('svg')).toHaveLength(1)
    const disconnectCount = disconnect.mock.calls.length

    second.remove()
    await vi.waitFor(() => expect(second.querySelector('svg')).toBeNull())
    expect(disconnect.mock.calls.length).toBeGreaterThan(disconnectCount)
  })

  it('observes only while read-only and disconnects when the editor is disposed', async () => {
    readOnly.value = false
    const message = showMessage()
    start()
    expect(observe).not.toHaveBeenCalled()
    expect(message.querySelector('svg')).toBeNull()

    readOnly.value = true
    await nextTick()
    expect(message.querySelector('svg')).not.toBeNull()
    readOnly.value = false
    await nextTick()
    expect(message.querySelector('svg')).toBeNull()
    expect(disconnect).toHaveBeenCalled()

    readOnly.value = true
    await nextTick()
    expect(message.querySelectorAll('svg')).toHaveLength(1)
    scope.stop()
    const observeCount = observe.mock.calls.length
    const nextMessage = showMessage()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(message.querySelector('svg')).toBeNull()
    expect(nextMessage.querySelector('svg')).toBeNull()
    expect(observe.mock.calls.length).toBe(observeCount)
  })
})
