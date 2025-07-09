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
  <div class="zoomer">
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

<style lang="scss" scoped>
.zoomer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  color: var(--ui-color-text);
  background: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-300);
  }
  &:active {
    background-color: var(--ui-color-grey-400);
  }
}
</style>
