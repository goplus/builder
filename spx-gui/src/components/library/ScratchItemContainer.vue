<template>
  <div :class="['scratch-item-container', { selected }]">
    <UIIcon v-if="selected" type="check" class="check-icon" />
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { defineProps } from 'vue'
import { UIIcon } from '../ui'

defineProps<{
  selected: boolean
}>()
</script>
<style scoped lang="scss">
.scratch-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  background-color: var(--ui-color-grey-300);
  height: 140px;
  border: 2px solid transparent;
  position: relative;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }

  &.selected {
    background-color: var(--ui-color-primary-200);
    border: 2px solid var(--ui-color-primary-500);
  }
}

.check-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  color: white;
  border-radius: 50%;
  background-color: var(--ui-color-primary-500);
  padding: 4px;
  width: 24px;
  height: 24px;
}
</style>
