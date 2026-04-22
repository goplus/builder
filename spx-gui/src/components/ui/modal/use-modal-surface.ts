/**
 * Shared modal-surface wiring.
 *
 * This composable connects a modal surface to the modal stack, keeps the
 * surface root attrs and topmost state in sync, computes the transform origin
 * used by open/close animations, and re-provides popup content into the modal
 * surface so dropdowns/tooltips opened inside a modal stay within that modal layer.
 */
import { computed, nextTick, ref, toValue, watch, type CSSProperties, type Ref, type WatchSource } from 'vue'
import { providePopupContainer, useLastClickEvent } from '../utils'
import { useModalRegistration } from './stack'

export type ModalTransformOrigin = {
  x: number
  y: number
}

export type UseModalSurfaceResult = {
  surfaceRootAttrs: Record<string, string>
  isTopmost: Readonly<Ref<boolean>>
  contentRef: Ref<HTMLElement | undefined>
  setContentRef(target: Element | { $el?: Element } | null): void
  setTransformOrigin(origin: ModalTransformOrigin | null): void
  transformStyle: Ref<CSSProperties | null>
}

export function useModalSurface(visibleSource: WatchSource<boolean>): UseModalSurfaceResult {
  const visible = computed(() => toValue(visibleSource))
  const registration = useModalRegistration(visible)
  const contentRef = ref<HTMLElement | undefined>(undefined)
  const explicitTransformOrigin = ref<ModalTransformOrigin | null>(null)
  // Lock the active transform origin for a single open/close cycle so the leave animation
  // collapses back to the same origin that was used when opening.
  const activeTransformOrigin = ref<ModalTransformOrigin | null>(null)
  const transformStyle = ref<CSSProperties | null>(null)
  const lastClickEvent = useLastClickEvent()

  providePopupContainer(contentRef)

  function setContentRef(target: Element | { $el?: Element } | null) {
    contentRef.value = resolveModalSurfaceElement(target) ?? undefined
  }

  function setTransformOrigin(origin: ModalTransformOrigin | null) {
    explicitTransformOrigin.value = origin
  }

  watch(
    [visible, explicitTransformOrigin],
    ([show, explicitOrigin], [prevShow]) => {
      if (!show) return

      if (explicitOrigin != null) {
        // Imperative overrides (for example, collapse-to-toolbar flows) win immediately.
        activeTransformOrigin.value = explicitOrigin
        return
      }

      if (!prevShow) {
        // Only capture the click origin when the modal starts opening. Later clicks while
        // the modal is open should not move the close animation origin.
        activeTransformOrigin.value = resolveClickOrigin(lastClickEvent.value)
      }
    },
    { immediate: true }
  )

  watch(
    [visible, contentRef, activeTransformOrigin],
    async ([show, contentEl, resolvedOrigin], _, onCleanup) => {
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })

      if (contentEl == null || !contentEl.isConnected) {
        transformStyle.value = null
        return
      }

      if (!show) return

      if (resolvedOrigin == null) {
        transformStyle.value = null
        return
      }

      // Wait until the teleported surface has settled into its final layout before measuring.
      await nextTick()
      if (cancelled || !contentEl.isConnected) return

      transformStyle.value = {
        transformOrigin: resolveTransformOrigin(contentEl, resolvedOrigin)
      }
    },
    { immediate: true, flush: 'post' }
  )

  return {
    contentRef,
    surfaceRootAttrs: registration.rootAttrs,
    isTopmost: registration.isTopmost,
    setContentRef,
    setTransformOrigin,
    transformStyle
  }
}

function resolveModalSurfaceElement(target: Element | { $el?: Element } | null) {
  if (target == null) return null
  if (target instanceof HTMLElement) return target
  if ('$el' in target) return target.$el instanceof HTMLElement ? target.$el : null
  return null
}

function resolveClickOrigin(clickEvent: MouseEvent | null): ModalTransformOrigin | null {
  if (clickEvent == null) return null
  return {
    x: clickEvent.clientX ?? clickEvent.x,
    y: clickEvent.clientY ?? clickEvent.y
  }
}

function resolveTransformOrigin(contentEl: HTMLElement, origin: ModalTransformOrigin) {
  if (contentEl.offsetParent instanceof HTMLElement) {
    // Prefer offset coordinates to match the previous modal behavior more closely, which gives
    // a closer visual result for large fixed-size modals like the asset library.
    return `${origin.x - contentEl.offsetLeft}px ${origin.y - contentEl.offsetTop}px`
  }

  // Fallback for environments where offset geometry isn't available (e.g. some tests).
  const rect = contentEl.getBoundingClientRect()
  return `${origin.x - rect.left}px ${origin.y - rect.top}px`
}
