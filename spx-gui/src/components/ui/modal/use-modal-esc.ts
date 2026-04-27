import { watch, type WatchSource } from 'vue'
import { useModalContainer } from '../utils'
import { findPopupRoot } from '../popup/stack'

/**
 * Close the current topmost modal with ESC when the key event originates from the
 * modal subtree (or from `document.body`).
 */
export function useModalEsc(source: WatchSource<boolean>, handler: () => void) {
  const modalContainerRef = useModalContainer()

  watch(
    [modalContainerRef, source],
    ([modalContainer, active], _, onCleanUp) => {
      if (modalContainer == null || !active) return

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return
        if (!isEscTargetWithinModalScope(modalContainer, e.target)) return
        handler()
      }

      document.addEventListener('keydown', handleKeydown)
      onCleanUp(() => {
        document.removeEventListener('keydown', handleKeydown)
      })
    },
    { immediate: true }
  )
}

function isEscTargetWithinModalScope(modalContainer: HTMLElement, target: EventTarget | null) {
  // Non-focusable DOM elements cannot trigger keydown events, so the target is either the
  // body or a focusable DOM element. If the target is the body, the modal should close.
  if (target === document.body) return true
  if (!(target instanceof Element)) return true
  if (findPopupRoot(target) != null) return false
  return modalContainer.contains(target)
}
