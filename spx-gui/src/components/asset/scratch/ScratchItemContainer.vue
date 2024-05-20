<template>
  <div :class="['scratch-item-container', { selected }]">
    <UICornerIcon v-show="selected" type="check" />
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { defineProps } from 'vue'
import { UICornerIcon } from '@/components/ui'

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
</style>
