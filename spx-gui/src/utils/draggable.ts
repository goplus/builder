/**
 * @desc Drag to move.
 */

import { watchEffect, type Ref } from 'vue'

export type Offset = {
  x: number
  y: number
}

export type DraggableOptions = {
  onDragStart?: () => void
  onDragMove?: (offset: Offset) => void
  onDragEnd?: () => void
}

export function useDraggable(
  handlerRef: Ref<HTMLElement | null | undefined>,
  { onDragStart, onDragMove, onDragEnd }: DraggableOptions = {}
) {
  const threshold = 5

  watchEffect((onCleanup) => {
    const handler = handlerRef.value
    if (handler == null) return

    let lastPos = { x: 0, y: 0 }
    let lastUserSelect: string
    let dragging = false

    function captureClick(e: MouseEvent) {
      e.stopPropagation()
      window.removeEventListener('click', captureClick, { capture: true })
    }

    const onMouseMove = (e: MouseEvent) => {
      const offsetX = e.clientX - lastPos.x
      const offsetY = e.clientY - lastPos.y
      if (!dragging && Math.sqrt(offsetX ** 2 + offsetY ** 2) < threshold) {
        return
      }
      dragging = true
      onDragMove?.({ x: offsetX, y: offsetY })
      lastPos = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      if (dragging) {
        // Prevent click event from triggering after drag
        window.addEventListener('click', captureClick, { capture: true })
        onDragEnd?.()
      }
      document.body.style.userSelect = lastUserSelect
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setTimeout(() => (dragging = false))
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      lastPos = { x: e.clientX, y: e.clientY }
      lastUserSelect = document.body.style.userSelect
      document.body.style.userSelect = 'none' // Prevent text selection
      onDragStart?.()
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    handler.addEventListener('mousedown', onMouseDown)

    onCleanup(() => {
      handler.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    })
  })
}
