<script setup lang="ts">
import { shallowRef, watch, type CSSProperties } from 'vue'
import { useLastClickEvent, useModalContainer } from '../utils'
import { useModalEsc } from './UIModalProvider.vue'

// Note:
// We are not using NaiveUI's modal because it causes issue when components inside the modal mount/unmount dynamically.
// You can find more information about the issue in https://github.com/goplus/builder/pull/2029#discussion_r2300530412 .

const props = defineProps<{
  visible?: boolean
  /**
   * This prop should not be passed manually. It is reserved for `UIModalProvider`
   * to indicate whether the current `UIFullScreenModal` is at the top layer.
   */
  active?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const lastClickEvent = useLastClickEvent()
const modalTransformStyle = shallowRef<CSSProperties | null>(null)
// Use the position of last click event as the transform origin of Modal, so that the modal appears from & disappears to the clicked position.
function updateModalTransformStyle() {
  modalTransformStyle.value =
    lastClickEvent.value == null ? null : { transformOrigin: `${lastClickEvent.value.x}px ${lastClickEvent.value.y}px` }
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) updateModalTransformStyle()
  },
  { immediate: true }
)

const attachTo = useModalContainer()

useModalEsc(
  () => props.active ?? true,
  () => emit('update:visible', false)
)
</script>

<template>
  <Teleport :to="attachTo">
    <Transition>
      <div v-if="visible" class="ui-full-screen-modal fixed inset-0 z-100" :style="modalTransformStyle">
        <div
          v-radar="{ name: 'Full screen modal', desc: 'A full screen modal dialog for specific purpose' }"
          class="h-screen w-screen flex flex-col bg-grey-100"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
@layer components {
  .ui-full-screen-modal.v-enter-active,
  .ui-full-screen-modal.v-leave-active {
    transition:
      transform 0.4s ease-in-out,
      opacity 0.2s ease-in-out 0.1s;
  }

  .ui-full-screen-modal.v-enter-from,
  .ui-full-screen-modal.v-leave-to {
    transform: scale(0);
    opacity: 0;
  }
}
</style>
