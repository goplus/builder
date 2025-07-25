/**
 * @desc Drag to move.
 */

import { watchEffect, type Ref } from 'vue'

export type Offset = {
  x: number
  y: number
}

export function useDraggable(handlerRef: Ref<HTMLElement | null | undefined>, onDragEnd: (offset: Offset) => void) {
  watchEffect((onCleanup) => {
    const handler = handlerRef.value
    if (handler == null) return

    let lastPos = { x: 0, y: 0 }

    const onMouseMove = (e: MouseEvent) => {
      onDragEnd({
        x: e.clientX - lastPos.x,
        y: e.clientY - lastPos.y
      })
      lastPos = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      document.body.style.userSelect = '' // Restore text selection
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      lastPos = { x: e.clientX, y: e.clientY }
      document.body.style.userSelect = 'none' // Prevent text selection
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
