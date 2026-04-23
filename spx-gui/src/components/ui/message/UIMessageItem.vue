<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
import type { MessageType } from './UIMessageProvider.vue'

const props = defineProps<{
  type: MessageType
  content: string
  visible: boolean
}>()

const emit = defineEmits<{
  'after-leave': []
}>()

function handleAfterLeave() {
  emit('after-leave')
}

// A small amount of JS is kept here because this node's height is driven by
// dynamic content. Pure CSS cannot smoothly transition height: auto, so we
// measure the real height first and then drive a max-height transition.
function handleEnter(el: Element) {
  const target = el as HTMLElement
  target.style.transition = 'none'
  const memorizedHeight = target.offsetHeight
  target.style.maxHeight = '0'
  forceReflow(target)
  target.style.transition = ''
  target.style.maxHeight = `${memorizedHeight}px`
}
function handleAfterEnter(el: Element) {
  const target = el as HTMLElement
  target.style.maxHeight = ''
}
function handleBeforeLeave(el: Element) {
  const target = el as HTMLElement
  target.style.maxHeight = `${target.offsetHeight}px`
  forceReflow(target)
}
function handleLeave(el: Element) {
  const target = el as HTMLElement
  target.style.maxHeight = '0'
}
// Flush layout between style writes so the previous max-height becomes the current transition start state.
function forceReflow(el: HTMLElement) {
  // Reading a layout-dependent property forces the browser to apply pending style/layout work now.
  void el.offsetWidth
}
</script>

<template>
  <!-- These hooks animate this item's own height expand/collapse. Removing them makes the items below jump upward more abruptly. -->
  <Transition
    name="ui-message-item"
    appear
    @enter="handleEnter"
    @after-enter="handleAfterEnter"
    @before-leave="handleBeforeLeave"
    @leave="handleLeave"
    @after-leave="handleAfterLeave"
  >
    <div v-if="props.visible" class="mb-2 pointer-events-auto">
      <div
        class="ui-message-item rounded-md shadow-md bg-grey-100 overflow-hidden py-[11px] px-xl flex flex-nowrap items-start text-title"
        role="status"
        aria-live="polite"
      >
        <div
          class="relative flex-none h-5 w-5 text-2xl mt-px mr-2"
          :class="{
            'text-primary-main': props.type === 'info' || props.type === 'loading',
            'text-success-main': props.type === 'success',
            'text-danger-main': props.type === 'error',
            'text-yellow-main': props.type === 'warning'
          }"
        >
          <UIIcon :type="props.type" class="h-full w-full" />
        </div>
        <div class="inline-block text-base wrap-break-word">
          {{ props.content }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
@layer components {
  .ui-message-item {
    max-width: min(367px, calc(100vw - 32px));
    transform-origin: center;
    transition-property: opacity, transform;
    transition-duration: 0.3s;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* These are the single card's own opacity / scale states. */
  .ui-message-item-enter-from .ui-message-item,
  .ui-message-item-leave-to .ui-message-item {
    opacity: 0;
    transform: scale(0.6);
  }
  .ui-message-item-enter-to .ui-message-item,
  .ui-message-item-leave-from .ui-message-item {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
