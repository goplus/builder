<script setup lang="ts">
import { UIIcon, type IconType } from '@/components/ui'

defineProps<{
  icon: IconType
}>()
</script>

<template>
  <button class="block-action-btn">
    <UIIcon class="icon" :type="icon" />
    <slot></slot>
  </button>
</template>

<style lang="scss" scoped>
.block-action-btn {
  display: flex;
  gap: 4px;
  align-items: center;
  border: none;
  background: none;
  padding: 0;
  height: 18px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--ui-color-text);
  cursor: pointer;

  &:hover {
    color: var(--ui-color-grey-700);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
