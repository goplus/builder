<script setup lang="ts">
import { computed } from 'vue'
import { useModalContainer } from '../utils'
import { useModalEsc } from './UIModalProvider.vue'
import { useModalSurface } from './use-modal-surface'

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

const attachTo = useModalContainer()
const { surfaceRootAttrs, setContentRef, transformStyle } = useModalSurface({
  visible: computed(() => props.visible ?? false)
})

function getModalTransformStyle() {
  return transformStyle.value
}

useModalEsc(
  () => props.active ?? true,
  () => emit('update:visible', false)
)
</script>

<template>
  <Teleport :to="attachTo">
    <Transition>
      <div
        v-if="visible"
        v-bind="surfaceRootAttrs"
        :ref="setContentRef"
        class="ui-full-screen-modal fixed inset-0 z-1100"
        :style="getModalTransformStyle()"
      >
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
