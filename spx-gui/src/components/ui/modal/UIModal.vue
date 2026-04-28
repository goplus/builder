<template>
  <Teleport v-if="attachTo != null" :to="attachTo">
    <Transition name="ui-modal">
      <div v-if="visible" class="fixed inset-0 z-1100 bg-overlay-modal" @click="handleMaskClick">
        <div
          class="h-full w-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div class="min-h-full w-full flex p-4">
            <div
              v-bind="surfaceAttrs"
              ref="containerRef"
              v-radar="radar ?? { name: 'Modal', desc: 'A modal dialog for specific purpose' }"
              role="dialog"
              aria-modal="true"
              tabindex="-1"
              class="ui-modal-surface"
              :class="surfaceClass"
              :style="transformStyle"
              @click.stop
            >
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
export type ModalSize = 'small' | 'medium' | 'large' | 'full'

export type ModalTransformOrigin = {
  x: number
  y: number
}
</script>

<script setup lang="ts">
import { computed, mergeProps, nextTick, ref, useAttrs, watch, type CSSProperties } from 'vue'
import type { RadarNodeMeta } from '@/utils/radar'
import { untilNotNull } from '@/utils/utils'
import {
  cn,
  type ClassValue,
  providePopupContainer,
  useLastClickEvent,
  useLayerRegistration,
  useModalContainer
} from '../utils'

defineOptions({
  // The teleported backdrop is an implementation detail. Keep fallthrough attrs on the
  // dialog surface so external class/style semantics stay compatible with the old modal.
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    size?: ModalSize
    visible?: boolean
    /** Whether to focus the first focusable element inside modal. */
    autoFocus?: boolean
    maskClosable?: boolean
    class?: ClassValue
    /**
     * Metadata for radar, equivalent to applying `v-radar` on the dialog surface.
     */
    radar?: RadarNodeMeta
    /**
     * This prop should not be passed manually. It is reserved for `UIModalProvider`
     * to indicate whether the current `UIModal` is at the top layer.
     */
    active?: boolean
  }>(),
  {
    size: 'medium',
    visible: false,
    autoFocus: true,
    maskClosable: true,
    active: true,
    class: undefined,
    radar: undefined
  }
)

const attrs = useAttrs()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

function handleMaskClick() {
  if (!props.maskClosable) return
  handleUpdateShow(false)
}

const attachTo = useModalContainer()
const containerRef = ref<HTMLElement | undefined>(undefined)
providePopupContainer(containerRef)

const visible = computed(() => props.visible)
const modalRegistration = useLayerRegistration(visible)

// Modal stack attrs and fallthrough attrs should both live on the surface element:
// - surfaceRootAttrs marks the actual modal root for stack/popup lookup
// - attrs preserves external style/data-* on the dialog container
const surfaceAttrs = computed(() => mergeProps(modalRegistration.rootAttrs, attrs))
const surfaceClass = computed(() =>
  cn(
    'm-auto max-w-full overflow-hidden outline-none bg-white rounded-lg shadow-lg',
    {
      'w-[480px]': props.size === 'small',
      'w-[640px]': props.size === 'medium',
      'w-[960px]': props.size === 'large',
      'w-full': props.size === 'full'
    },
    'flex flex-col',
    props.class
  )
)

watch(
  () => props.visible,
  async (visible, previousVisible, onCleanup) => {
    if (!visible || previousVisible === true || !props.autoFocus) return

    const controller = new AbortController()
    onCleanup(() => controller.abort())

    const container = await untilNotNull(containerRef, controller.signal).catch(() => null)
    if (controller.signal.aborted || container == null || !container.isConnected) return
    const focusTarget = getFirstFocusableElement(container) ?? container
    focusTarget.focus()
  },
  { immediate: true, flush: 'post' }
)

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

watch(
  () => props.active && modalRegistration.isTopmost.value,
  async (active, _, onCleanUp) => {
    if (!active) return

    const controller = new AbortController()
    onCleanUp(() => controller.abort())
    const container = await untilNotNull(containerRef, controller.signal).catch(() => null)
    if (controller.signal.aborted || container == null || !container.isConnected) return

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!isEscTargetWithinModalScope(container, e.target)) return
      emit('update:visible', false)
    }

    document.addEventListener('keydown', handleKeydown)
    onCleanUp(() => {
      document.removeEventListener('keydown', handleKeydown)
    })
  },
  { immediate: true }
)

function isEscTargetWithinModalScope(modalContainer: HTMLElement, target: EventTarget | null) {
  // Non-focusable DOM elements cannot trigger keydown events, so the target is either the
  // body or a focusable DOM element. If the target is the body, the modal should close.
  if (target === document.body) return true
  if (!(target instanceof Element)) return true
  return modalContainer.contains(target)
}

// Imperative transform-origin override requested by external callers for the
// current modal cycle (for example, collapse-back-to-trigger flows).
const explicitTransformOrigin = ref<ModalTransformOrigin | null>(null)
// The final animation origin for the current modal cycle, resolved from the open
// position and any later explicit override.
const resolvedTransformOrigin = ref<ModalTransformOrigin | null>(null)

// Inline style applied to the teleported modal surface after the final origin has
// been converted into surface-local coordinates.
const transformStyle = ref<CSSProperties | null>(null)
const lastClickEvent = useLastClickEvent()

function setTransformOrigin(origin: ModalTransformOrigin | null) {
  explicitTransformOrigin.value = origin
}

// If a caller overrides the origin while the modal is already open, switch the
// current cycle to that explicit origin immediately.
watch(explicitTransformOrigin, (explicitOrigin) => {
  if (!visible.value || explicitOrigin == null) return
  resolvedTransformOrigin.value = explicitOrigin
})

// When a new open cycle starts, capture the origin once: prefer an explicit
// override if one is already present, otherwise fall back to the last click point.
watch(
  visible,
  (show, prevShow) => {
    if (!show || prevShow) return

    const explicitOrigin = explicitTransformOrigin.value
    resolvedTransformOrigin.value = explicitOrigin ?? resolveClickOrigin(lastClickEvent.value)
  },
  { immediate: true }
)

// Recompute the inline transform-origin whenever visibility, surface mounting, or
// the resolved origin changes. The measured CSS value must be relative to the modal
// surface itself rather than viewport coordinates.
watch(
  [visible, containerRef, resolvedTransformOrigin],
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

defineExpose({
  setTransformOrigin
})
</script>

<style>
@layer components {
  .ui-modal-enter-active {
    transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-modal-leave-active {
    transition: opacity 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .ui-modal-enter-from,
  .ui-modal-leave-to {
    opacity: 0;
  }

  .ui-modal-enter-active .ui-modal-surface {
    transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-modal-leave-active .ui-modal-surface {
    transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .ui-modal-enter-from .ui-modal-surface,
  .ui-modal-leave-to .ui-modal-surface {
    transform: scale(0.5);
  }
}
</style>
