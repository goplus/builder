<template>
  <NModal
    class="ui-modal"
    :to="attachTo"
    :show="visible"
    :auto-focus="autoFocus"
    :trap-focus="false"
    :mask-closable="maskClosable"
    :class="{ 'has-custom-origin': !!customTransformOrigin }"
    @update:show="handleUpdateShow"
  >
    <div
      ref="containerRef"
      v-radar="radar ?? { name: 'Modal', desc: 'A modal dialog for specific purpose' }"
      :class="['container', `ui-modal-size-${size || 'medium'}`]"
    >
      <slot></slot>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue'
import { NModal } from 'naive-ui'
import type { RadarNodeMeta } from '@/utils/radar'
import { useLastClickEvent, useModalContainer } from '../utils'
import { useModalEsc } from './UIModalProvider.vue'

export type ModalSize = 'small' | 'medium' | 'large' | 'full'
export type TransformOrigin = { x: number; y: number }

const props = defineProps<{
  size?: ModalSize
  visible?: boolean
  autoFocus?: boolean
  maskClosable?: boolean
  /**
   * Metadata for radar, like `v-radar`.
   * There's issue with using `v-radar` directly on `NModal`, so we pass it by property instead and set it on the root element.
   * TODO: Update implementation of `UIModal` to support using `v-radar` directly.
   */
  radar?: RadarNodeMeta
  /**
   * This prop should not be passed manually. It is reserved for `UIModalProvider`
   * to indicate whether the current `UIModal` is at the top layer.
   */
  active?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const attachTo = useModalContainer()

const lastClickEvent = useLastClickEvent()
const containerRef = ref<HTMLElement | null>(null)
const customTransformOrigin = ref<TransformOrigin>({ x: 0, y: 0 })

function setTransformOrigin(transformOrigin: TransformOrigin) {
  customTransformOrigin.value = transformOrigin
}

watch(
  () => props.visible,
  (visible) => {
    // For unknown reasons, naive-ui's `transform-origin: mouse` is not working.
    // We implement this feature internally, which aligns with our goal to reduce dependency on naive-ui.
    if (visible && lastClickEvent.value != null)
      setTransformOrigin({ x: lastClickEvent.value.x, y: lastClickEvent.value.y })
  },
  {
    immediate: true
  }
)

const modalElRef = ref<HTMLElement | null>(null)
watchEffect(() => {
  if (containerRef.value == null) return
  let modalEl = modalElRef.value
  // Cannot get the modal element directly through ref, temporarily obtained via selector
  if (modalEl == null) {
    modalEl = modalElRef.value = containerRef.value.closest('.ui-modal')
  }

  if (modalEl != null) {
    const { offsetLeft, offsetTop } = containerRef.value
    const { x, y } = customTransformOrigin.value
    // Internal handling of NModal in naive-ui prevents us from passing customTransformOrigin via style props.
    // Since a better solution is currently unavailable, we manually set the property on the .ui-modal element.
    modalEl.style.setProperty('--ui-modal-custom-origin', `${x - offsetLeft}px ${y - offsetTop}px`)
  }
})

defineExpose({
  setTransformOrigin
})

useModalEsc(
  () => props.active ?? true,
  () => emit('update:visible', false)
)
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  box-shadow: var(--ui-box-shadow-big);
  border-radius: var(--ui-border-radius-2);
  background-color: white;
  overflow: hidden;
}

.ui-modal-size-small {
  width: 480px;
}

.ui-modal-size-medium {
  width: 640px;
}

.ui-modal-size-large {
  width: 960px;
}

.ui-modal-size-full {
  width: 100%;
  margin: 16px;
}
</style>

<style lang="scss">
.ui-modal.has-custom-origin {
  // Override NaiveUI's transform-origin to support custom animation origins
  transform-origin: var(--ui-modal-custom-origin, center) !important;

  &.fade-in-scale-up-transition-enter-active,
  &.fade-in-scale-up-transition-leave-active,
  &.fade-in-scale-up-transition-enter-to,
  &.fade-in-scale-up-transition-leave-to {
    transform-origin: var(--ui-modal-custom-origin, center) !important;
  }
}
</style>
