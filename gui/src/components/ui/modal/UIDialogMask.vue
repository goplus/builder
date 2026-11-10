<script setup lang="ts">
const props = defineProps<{
  contentElement?: HTMLElement
}>()

const emit = defineEmits<{
  /** Emitted only when both the pointer press and release are outside the content. */
  click: []
}>()

// A selection drag can produce a backdrop click when it starts inside the content and ends outside.
let maskClick = false

function isOutsideContent(event: PointerEvent) {
  return event.target instanceof Node && props.contentElement != null && !props.contentElement.contains(event.target)
}

function onPointerDown(event: PointerEvent) {
  maskClick = isOutsideContent(event)
}

function onPointerUp(event: PointerEvent) {
  maskClick = maskClick && isOutsideContent(event)
}

function onPointerCancel() {
  maskClick = false
}

function onClick() {
  const shouldClose = maskClick
  maskClick = false
  if (shouldClose) emit('click')
}
</script>

<template>
  <div
    class="fixed inset-0 z-1100 bg-overlay-modal"
    @pointerdown.capture="onPointerDown"
    @pointerup.capture="onPointerUp"
    @pointercancel.capture="onPointerCancel"
    @click="onClick"
  >
    <slot></slot>
  </div>
</template>
