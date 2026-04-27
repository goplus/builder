/**
 * Shared modal-surface wiring.
 *
 * This composable connects a modal surface to the modal stack, keeps the
 * surface root attrs in sync, computes the transform origin
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
  contentRef: Ref<HTMLElement | undefined>
  setTransformOrigin(origin: ModalTransformOrigin | null): void
  transformStyle: Ref<CSSProperties | null>
}

export function useModalSurface(visibleSource: WatchSource<boolean>): UseModalSurfaceResult {
  const visible = computed(() => toValue(visibleSource))
  const registration = useModalRegistration(visible)
  const contentRef = ref<HTMLElement | undefined>(undefined)
  const explicitTransformOrigin = ref<ModalTransformOrigin | null>(null)
  // The final animation origin for the current modal cycle, resolved from the open
  // position and any later explicit override.
  const resolvedTransformOrigin = ref<ModalTransformOrigin | null>(null)
  const transformStyle = ref<CSSProperties | null>(null)
  const lastClickEvent = useLastClickEvent()

  providePopupContainer(contentRef)

  function setTransformOrigin(origin: ModalTransformOrigin | null) {
    explicitTransformOrigin.value = origin
  }

  watch(explicitTransformOrigin, (explicitOrigin) => {
    if (!visible.value || explicitOrigin == null) return
    // Imperative overrides (for example, collapse-to-toolbar flows) win immediately.
    resolvedTransformOrigin.value = explicitOrigin
  })

  watch(
    visible,
    (show, prevShow) => {
      if (!show || prevShow) return

      const explicitOrigin = explicitTransformOrigin.value
      resolvedTransformOrigin.value = explicitOrigin ?? resolveClickOrigin(lastClickEvent.value)
    },
    { immediate: true }
  )

  watch(
    [visible, contentRef, resolvedTransformOrigin],
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
    setTransformOrigin,
    transformStyle
  }
}

function resolveClickOrigin(clickEvent: MouseEvent | null): ModalTransformOrigin | null {
  if (clickEvent == null) return null
  return {
    x: clickEvent.clientX,
    y: clickEvent.clientY
  }
}

function resolveTransformOrigin(contentEl: HTMLElement, origin: ModalTransformOrigin) {
  const rect = contentEl.getBoundingClientRect()
  return `${origin.x - rect.left}px ${origin.y - rect.top}px`
}
