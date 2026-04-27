<script setup lang="ts">
import { cn, type ClassValue } from '../utils'
import { useModalContainer } from '../utils'
import { useModalEsc } from './use-modal-esc'
import { useModalSurface } from './use-modal-surface'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    /**
     * This prop should not be passed manually. It is reserved for `UIModalProvider`
     * to indicate whether the current `UIFullScreenModal` is at the top layer.
     */
    active?: boolean
    class?: ClassValue
  }>(),
  {
    visible: false,
    active: undefined,
    class: undefined
  }
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const attachTo = useModalContainer()

const { surfaceRootAttrs, contentRef, transformStyle } = useModalSurface(() => props.visible)

useModalEsc(
  () => props.active ?? true,
  () => emit('update:visible', false)
)
</script>

<template>
  <Teleport :to="attachTo">
    <Transition name="ui-fullscreen-modal">
      <div
        v-if="visible"
        v-bind="surfaceRootAttrs"
        ref="contentRef"
        :class="cn('fixed inset-0 z-1100', props.class)"
        :style="transformStyle"
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
  .ui-fullscreen-modal-enter-active,
  .ui-fullscreen-modal-leave-active {
    transition:
      transform 0.25s cubic-bezier(0, 0, 0.2, 1),
      opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-fullscreen-modal-enter-from,
  .ui-fullscreen-modal-leave-to {
    transform: scale(0);
    opacity: 0;
  }
}
</style>
