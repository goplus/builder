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

<script setup lang="ts">
import { computed, mergeProps, useAttrs, watch } from 'vue'
import type { RadarNodeMeta } from '@/utils/radar'
import { untilNotNull } from '@/utils/utils'
import { cn, type ClassValue, useModalContainer } from '../utils'
import { useModalEsc } from './use-modal-esc'
import { useModalSurface } from './use-modal-surface'

defineOptions({
  // The teleported backdrop is an implementation detail. Keep fallthrough attrs on the
  // dialog surface so external class/style semantics stay compatible with the old modal.
  inheritAttrs: false
})

export type ModalSize = 'small' | 'medium' | 'large' | 'full'

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

const {
  contentRef: containerRef,
  surfaceRootAttrs,
  setTransformOrigin,
  transformStyle
} = useModalSurface(() => props.visible)

// Modal stack attrs and fallthrough attrs should both live on the surface element:
// - surfaceRootAttrs marks the actual modal root for stack/popup lookup
// - attrs preserves external style/data-* on the dialog container
const surfaceAttrs = computed(() => mergeProps(surfaceRootAttrs, attrs))
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

    const container = await untilNotNull(containerRef, controller.signal)
    if (controller.signal.aborted || !container.isConnected) return
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

defineExpose({
  setTransformOrigin
})

useModalEsc(
  () => props.active,
  () => emit('update:visible', false)
)
</script>

<style>
@layer components {
  .ui-modal-enter-active {
    transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-modal-leave-active {
    transition: opacity 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

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
