/**
 * @desc Drag to move.
 */

import { ref, watchEffect, type Ref } from 'vue'

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
  const isDragging = ref(false)

  watchEffect((onCleanup) => {
    const handler = handlerRef.value
    if (handler == null) return

    let lastPos = { x: 0, y: 0 }

    const onMouseMove = (e: MouseEvent) => {
      isDragging.value = true
      onDragMove?.({
        x: e.clientX - lastPos.x,
        y: e.clientY - lastPos.y
      })
      lastPos = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      onDragEnd?.()
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setTimeout(() => (isDragging.value = false))
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      lastPos = { x: e.clientX, y: e.clientY }
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

  return {
    draggable: isDragging
  }
}
