import { watch, type WatchSource } from 'vue'
import type { MonacoEditor } from '../monaco'

export function useReadOnlyMessageBubble(
  editorSource: WatchSource<MonacoEditor | null>,
  readOnlySource: WatchSource<boolean | undefined>
) {
  watch(
    [editorSource, readOnlySource],
    ([editor, readOnly], _, onCleanup) => {
      if (!readOnly || editor == null) return
      const editorEl = editor.getDomNode()
      if (editorEl == null) return

      let message: HTMLElement | null = null
      let bubble: SVGSVGElement | null = null
      const resizeObserver = new ResizeObserver(([entry]) => {
        if (bubble == null) return
        const { inlineSize: width, blockSize: height } = entry.borderBoxSize[0]
        const right = width - 0.5
        const bottom = height - 12.5
        bubble.setAttribute('viewBox', `0 0 ${width} ${height}`)
        bubble.firstElementChild?.setAttribute(
          'd',
          `M 6.5 0.5 H ${right - 6} Q ${right} 0.5 ${right} 6.5
           V ${bottom - 6} Q ${right} ${bottom} ${right - 6} ${bottom}
           H 22.5 C 18 ${bottom} 17 ${bottom} 14 ${bottom + 2.6}
           L 4.4 ${bottom + 10.4} Q 0.5 ${bottom + 14} 0.5 ${bottom + 9}
           V 6.5 Q 0.5 0.5 6.5 0.5 Z`
        )
      })

      const updateMessage = () => {
        const nextMessage = editorEl.querySelector<HTMLElement>('.monaco-editor-overlaymessage')
        if (nextMessage === message) return
        resizeObserver.disconnect()
        bubble?.remove()
        message = nextMessage
        bubble = null
        if (message == null) return

        const namespace = 'http://www.w3.org/2000/svg'
        bubble = document.createElementNS(namespace, 'svg')
        bubble.classList.add('code-editor-read-only-bubble')
        bubble.setAttribute('aria-hidden', 'true')
        bubble.appendChild(document.createElementNS(namespace, 'path'))
        message.prepend(bubble)
        resizeObserver.observe(message)
      }

      // Monaco creates and replaces this widget when an edit is blocked.
      const mutationObserver = new MutationObserver(updateMessage)
      mutationObserver.observe(editorEl, { childList: true, subtree: true })
      updateMessage()
      onCleanup(() => {
        mutationObserver.disconnect()
        resizeObserver.disconnect()
        bubble?.remove()
      })
    },
    { immediate: true }
  )
}
