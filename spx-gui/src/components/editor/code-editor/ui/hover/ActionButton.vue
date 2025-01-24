<template>
  <button class="action-button">
    <CommandIcon class="icon" :type="icon" />
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import type { CommandIconType } from '../../common'
import CommandIcon from '../command/CommandIcon.vue'

defineProps<{
  icon: CommandIconType
}>()
</script>

<style lang="scss" scoped>
.action-button {
  display: flex;
  gap: 4px;
  width: fit-content;
  align-items: center;
  height: 32px;
  padding: 0 6px;
  color: var(--ui-color-text);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-1);
  cursor: pointer;
  white-space: nowrap;
  transition: 0.2s;

  &:hover {
    background: var(--ui-color-grey-400);
  }
  &:active {
    background: var(--ui-color-grey-500);
  }
}
</style>
