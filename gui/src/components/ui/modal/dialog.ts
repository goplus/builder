/**
 * Behavior shared by dialog surfaces (Modal, Drawer, etc.).
 */
import { watch, type Ref } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'
import { untilNotNull } from '@/utils/utils'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFirstFocusableElement(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).find((element) => {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
    return element.tabIndex >= 0
  })
}

/** Focus the first focusable element inside the surface whenever `shouldFocus` turns true. */
export function useDialogAutoFocus(surfaceRef: Ref<HTMLElement | undefined>, shouldFocus: () => boolean) {
  watch(
    shouldFocus,
    async (focus, _, onCleanup) => {
      if (!focus) return

      const signal = getCleanupSignal(onCleanup)
      const surface = await untilNotNull(surfaceRef, signal)
      const focusTarget = getFirstFocusableElement(surface)
      if (focusTarget != null) focusTarget.focus()
    },
    { immediate: true }
  )
}

/** Call `close` on Escape while the dialog is the topmost layer. */
export function useDialogEscape(surfaceRef: Ref<HTMLElement | undefined>, isTopmost: Ref<boolean>, close: () => void) {
  watch(
    isTopmost,
    async (topmost, _, onCleanup) => {
      if (!topmost) return

      const signal = getCleanupSignal(onCleanup)
      const surface = await untilNotNull(surfaceRef, signal)

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return
        if (!isEscTargetWithinDialogScope(surface, e.target)) return
        close()
      }

      document.addEventListener('keydown', handleKeydown, { signal })
    },
    { immediate: true }
  )
}

function isEscTargetWithinDialogScope(surface: HTMLElement, target: EventTarget | null) {
  // Non-focusable DOM elements cannot trigger keydown events, so the target is either the
  // body or a focusable DOM element. If the target is the body, the dialog should close.
  if (target === document.body) return true
  if (!(target instanceof Element)) return true
  return surface.contains(target)
}
