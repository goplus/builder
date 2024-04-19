<template>
  <div :class="['scratch-item-container', { selected }]">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  selected: boolean
}>()
</script>
<style scoped lang="scss">
.scratch-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  background-color: var(--ui-color-grey-300);
  height: 140px;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }

  &.selected {
    background-color: var(--ui-color-primary-200);
    border: 2px solid var(--ui-color-primary-500);
  }
}
</style>
