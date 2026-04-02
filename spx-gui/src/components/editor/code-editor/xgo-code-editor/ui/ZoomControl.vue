<script setup lang="ts">
import iconZoomIn from './icons/zoom-in.svg?raw'
import iconZoomOut from './icons/zoom-out.svg?raw'
import iconZoomReset from './icons/zoom-reset.svg?raw'

const emit = defineEmits<{
  in: []
  out: []
  reset: []
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <!-- eslint-disable vue/no-v-html -->
    <button
      v-radar="{ name: 'Zoom in', desc: 'Zoom in the code editor' }"
      class="zoom-btn"
      title="Zoom in"
      @click="emit('in')"
      v-html="iconZoomIn"
    />
    <button
      v-radar="{ name: 'Zoom out', desc: 'Zoom out the code editor' }"
      class="zoom-btn"
      title="Zoom out"
      @click="emit('out')"
      v-html="iconZoomOut"
    />
    <button
      v-radar="{ name: 'Reset zoom', desc: 'Reset code editor zoom to default' }"
      class="zoom-btn"
      title="Reset"
      @click="emit('reset')"
      v-html="iconZoomReset"
    />
  </div>
</template>

<style scoped>
@reference "../../../../../app.css";

.zoom-btn {
  @apply flex h-10 w-10 cursor-pointer items-center justify-center rounded-2 border-0 bg-transparent p-0 text-text transition-colors hover:bg-grey-300 active:bg-grey-400;
}
</style>
