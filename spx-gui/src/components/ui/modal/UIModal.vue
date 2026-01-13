<template>
  <NModal
    class="ui-modal"
    :to="attachTo"
    :show="visible"
    :auto-focus="autoFocus"
    :trap-focus="false"
    :mask-closable="maskClosable"
    :transform-origin="isString(transformOrigin) ? transformOrigin : undefined"
    :class="{ 'has-custom-origin': !!customTransformOrigin }"
    @update:show="handleUpdateShow"
  >
    <div
      ref="containerRef"
      v-radar="radar ?? { name: 'Modal', desc: 'A modal dialog for specific purpose' }"
      :class="['container', `size-${size || 'medium'}`]"
    >
      <slot></slot>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, watch } from 'vue'
import { isString } from 'lodash'
import { NModal } from 'naive-ui'
import type { RadarNodeMeta } from '@/utils/radar'
import { useLastClickEvent, useModalContainer } from '../utils'

export type ModalSize = 'small' | 'medium' | 'large' | 'full'

type Pos = { x: number; y: number }

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
  transformOrigin?: InstanceType<typeof NModal>['transformOrigin'] | Pos | null
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const attachTo = useModalContainer()

const lastClickEvent = useLastClickEvent()
const mousePosRef = ref<Pos | null>(null)
watch(
  () => props.visible,
  (visible) => {
    if (visible && lastClickEvent.value != null)
      mousePosRef.value = { x: lastClickEvent.value.x, y: lastClickEvent.value.y }
  },
  {
    immediate: true
  }
)
const containerRef = ref<HTMLElement | null>(null)
const resolvedTransformOrigin = computed(() => {
  if (containerRef.value == null || props.transformOrigin == null) return null
  if (props.transformOrigin === 'center') return null
  if (props.transformOrigin === 'mouse')
    return mousePosRef.value != null ? { x: mousePosRef.value.x, y: mousePosRef.value.y } : null
  return props.transformOrigin
})
const customTransformOrigin = computed(() => {
  if (containerRef.value == null || resolvedTransformOrigin.value == null) return null
  const { x, y } = resolvedTransformOrigin.value
  return `${x - containerRef.value.offsetLeft}px ${y - containerRef.value.offsetTop}px`
})

const modalElRef = ref<HTMLElement | null>(null)
watchEffect(() => {
  if (containerRef.value == null) return
  let modalEl = modalElRef.value
  // Cannot get the modal element directly through ref, temporarily obtained via selector
  if (modalEl == null) {
    modalEl = modalElRef.value = containerRef.value.closest('.ui-modal')
  }

  if (customTransformOrigin.value != null && modalEl != null) {
    modalEl.style.setProperty('--ui-modal-custom-origin', customTransformOrigin.value)
  }
})
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

.size-small {
  width: 480px;
}

.size-medium {
  width: 640px;
}

.size-large {
  width: 960px;
}

.size-full {
  width: 100%;
  margin: 16px;
}
</style>

<style lang="scss">
.ui-modal.has-custom-origin {
  transform-origin: var(--ui-modal-custom-origin, center) !important;

  &.fade-in-scale-up-transition-enter-active,
  &.fade-in-scale-up-transition-leave-active,
  &.fade-in-scale-up-transition-enter-to,
  &.fade-in-scale-up-transition-leave-to {
    transform-origin: var(--ui-modal-custom-origin, center) !important;
  }
}
</style>
