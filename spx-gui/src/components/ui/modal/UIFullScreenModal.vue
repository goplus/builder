<script setup lang="ts">
import { shallowRef, watch, type CSSProperties } from 'vue'
import { useLastClickEvent, useModalContainer } from '../utils'

// Note:
// We are not using NaiveUI's modal because it causes issue when components inside the modal mount/unmount dynamically.
// You can find more information about the issue in https://github.com/goplus/builder/pull/2029#discussion_r2300530412 .

const props = defineProps<{
  visible?: boolean
}>()

defineEmits<{
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
</script>

<template>
  <Teleport :to="attachTo">
    <Transition>
      <div v-if="visible" class="ui-full-screen-modal" :style="modalTransformStyle">
        <div
          v-radar="{ name: 'Full screen modal', desc: 'A full screen modal dialog for specific purpose' }"
          class="container"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.ui-full-screen-modal {
  position: fixed;
  z-index: 100;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;

  &.v-enter-active,
  &.v-leave-active {
    transition:
      transform 0.4s ease-in-out,
      opacity 0.2s ease-in-out 0.1s;
  }

  &.v-enter-from,
  &.v-leave-to {
    transform: scale(0);
    opacity: 0;
  }
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--ui-color-grey-100);
}
</style>
