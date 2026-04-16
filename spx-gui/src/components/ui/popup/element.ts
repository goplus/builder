import type { Ref } from 'vue'

type PopupElementTarget =
  | Element
  | {
      $el?: Element
      triggerEl?: HTMLElement | Ref<HTMLElement | null> | null
    }
  | null

/**
 * Normalize popup-related template refs to the concrete HTMLElement used by
 * positioning and stack logic. This accepts native elements, component
 * instances exposing `triggerEl`, and component instances exposing `$el`.
 */
export function resolvePopupElement(target: PopupElementTarget) {
  if (target == null) return null
  if (target instanceof HTMLElement) return target
  if ('triggerEl' in target) {
    const triggerEl = target.triggerEl
    if (triggerEl instanceof HTMLElement) return triggerEl
    if (triggerEl != null && typeof triggerEl === 'object' && 'value' in triggerEl) {
      return triggerEl.value instanceof HTMLElement ? triggerEl.value : null
    }
  }
  if ('$el' in target) return target.$el instanceof HTMLElement ? target.$el : null
  return null
}
