<script setup lang="ts">
const props = defineProps<{
  contentElement?: HTMLElement
}>()

const emit = defineEmits<{
  click: []
}>()

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
