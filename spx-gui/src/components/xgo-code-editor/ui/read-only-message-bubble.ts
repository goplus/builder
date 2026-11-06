import { watch, type WatchSource } from 'vue'
import type { MonacoEditor } from '../monaco'

// Match CodeEditorUI.vue's 1px stroke and 9px tail padding.
const strokeInset = 0.5
const tailHeight = 9
const cornerRadius = 6

export function useReadOnlyMessageBubble(
  editorSource: WatchSource<MonacoEditor | null>,
  readOnlySource: WatchSource<boolean>
) {
  watch(
    [editorSource, readOnlySource],
    ([editor, readOnly], _, onCleanup) => {
      if (!readOnly || editor == null) return
      // NOTE: These selectors target Monaco 0.52's internal DOM. Recheck the widget container,
      // .monaco-editor-overlaymessage, .below, .message and .anchor styles when upgrading Monaco.
      const widgetContainer = editor.getDomNode()?.querySelector('.overflowingContentWidgets')
      if (widgetContainer == null) return

      let message: HTMLElement | null = null
      let bubble: SVGSVGElement | null = null
      const resizeObserver = new ResizeObserver(([entry]) => {
        const size = entry?.borderBoxSize[0]
        if (bubble == null || size == null) return
        const { inlineSize: width, blockSize: height } = size
        const right = width - strokeInset
        const bottom = height - tailHeight - strokeInset
        const cornerEnd = strokeInset + cornerRadius
        bubble.setAttribute('viewBox', `0 0 ${width} ${height}`)
        // Tail control points are offsets from the body bottom, blending into its left edge.
        bubble.firstElementChild?.setAttribute(
          'd',
          `M ${cornerEnd} ${strokeInset} H ${right - cornerRadius}
           Q ${right} ${strokeInset} ${right} ${cornerEnd}
           V ${bottom - cornerRadius} Q ${right} ${bottom} ${right - cornerRadius} ${bottom}
           H 12 C 9.5 ${bottom} 9 ${bottom} 7.5 ${bottom + 2}
           L 2.8 ${bottom + 7.8} Q ${strokeInset} ${bottom + 10.5} ${strokeInset} ${bottom + 6.75}
           V ${cornerEnd} Q ${strokeInset} ${strokeInset} ${cornerEnd} ${strokeInset} Z`
        )
      })

      const updateMessage = () => {
        const nextMessage = widgetContainer.querySelector<HTMLElement>('.monaco-editor-overlaymessage')
        // Repeated attempts replace the widget; keep an existing bubble until its identity changes.
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

      // Overflowing content widgets are direct children; ignore code rendering and nested SVG mutations.
      const mutationObserver = new MutationObserver(updateMessage)
      mutationObserver.observe(widgetContainer, { childList: true })
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
