<template>
  <Teleport v-if="attachTo != null" :to="attachTo">
    <Transition name="ui-modal">
      <div
        v-if="visible"
        class="ui-modal fixed inset-0 z-1100 flex items-center justify-center p-4"
        @click="handleMaskClick"
      >
        <div
          v-bind="surfaceAttrs"
          :ref="setContentRef"
          v-radar="radar ?? { name: 'Modal', desc: 'A modal dialog for specific purpose' }"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          class="ui-modal-surface"
          :class="surfaceClass"
          :style="surfaceStyle"
          @click.stop
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, mergeProps, nextTick, useAttrs, watch } from 'vue'
import type { RadarNodeMeta } from '@/utils/radar'
import { cn, type ClassValue, useModalContainer } from '../utils'
import { useModalEsc } from './UIModalProvider.vue'
import { useModalSurface } from './use-modal-surface'

defineOptions({
  // The teleported backdrop is an implementation detail. Keep fallthrough attrs on the
  // dialog surface so external class/style semantics stay compatible with the old modal.
  inheritAttrs: false
})

export type ModalSize = 'small' | 'medium' | 'large' | 'full'
export type TransformOrigin = { x: number; y: number }

const props = withDefaults(
  defineProps<{
    size?: ModalSize
    visible?: boolean
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
  setContentRef,
  setTransformOrigin: updateTransformOrigin,
  transformStyle
} = useModalSurface({ visible: computed(() => props.visible) })

// Modal stack attrs and fallthrough attrs should both live on the surface element:
// - surfaceRootAttrs marks the actual modal root for stack/popup lookup
// - attrs preserves external style/data-* on the dialog container
const surfaceAttrs = computed(() => mergeProps(surfaceRootAttrs, attrs))
const surfaceClass = computed(() =>
  cn(
    'flex flex-col overflow-hidden bg-white outline-none max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]',
    'shadow-[var(--ui-box-shadow-big)] rounded-[var(--ui-border-radius-2)]',
    {
      'w-[480px]': props.size === 'small',
      'w-[640px]': props.size === 'medium',
      'w-[960px]': props.size === 'large',
      'w-full': props.size === 'full'
    },
    props.class
  )
)
const surfaceStyle = computed(() => transformStyle.value ?? undefined)

function setTransformOrigin(transformOrigin: TransformOrigin) {
  updateTransformOrigin(transformOrigin)
}

watch(
  [() => props.visible, containerRef, () => props.autoFocus],
  async ([visible, container, autoFocus]) => {
    if (!visible || !autoFocus || container == null) return
    // First tick: let `visible` propagate through the transition/teleport render.
    // Second tick: let the teleported surface ref settle before focusing.
    await nextTick()
    await nextTick()
    if (!container.isConnected) return
    container.focus()
  },
  { immediate: true }
)

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
  .ui-modal {
    background-color: rgb(0 0 0 / 40%);
  }

  .ui-modal-enter-active,
  .ui-modal-leave-active {
    transition: background-color 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-modal-enter-from,
  .ui-modal-leave-to {
    background-color: rgb(0 0 0 / 0%);
  }

  .ui-modal-enter-active .ui-modal-surface {
    /* Match the old Naive UI modal enter easing so the scale-up feels more obvious. */
    transition:
      transform 0.25s cubic-bezier(0, 0, 0.2, 1),
      opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-modal-leave-active .ui-modal-surface {
    /* Leave uses the old ease-in curve so the modal collapses back more decisively. */
    transition:
      transform 0.25s cubic-bezier(0.4, 0, 1, 1),
      opacity 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .ui-modal-enter-from .ui-modal-surface,
  .ui-modal-leave-to .ui-modal-surface {
    transform: scale(0.5);
    opacity: 0;
  }
}
</style>
