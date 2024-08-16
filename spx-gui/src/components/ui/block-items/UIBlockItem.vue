<template>
  <div
    :class="[
      'block-item',
      active && 'block-item-active',
      `block-item-${variant}`,
      `block-item-${size}`
    ]"
    :style="style"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Color } from '..'

const props = withDefaults(
  defineProps<{
    active?: boolean
    color?: Color
    variant?: 'standard' | 'colorful'
    size?: 'medium' | 'large'
  }>(),
  {
    variant: 'standard',
    size: 'medium',
    color: 'primary'
  }
)

const style = computed(() => ({
  '--color-outline': `var(--ui-color-${props.color}-main)`,
  '--color-background': `var(--ui-color-${props.color}-200)`,
  '--color-background-faint': `var(--ui-color-${props.color}-100)`
}))
</script>

<style lang="scss" scoped>
.block-item {
  &.block-item-medium {
    width: 88px;
    height: 88px;
    min-height: 88px;
    // Without min-height, the height of the element can be smaller than 88px
    // in editor sider list.
  }
  &.block-item-large {
    width: 140px;
    height: 140px;
    min-height: 140px;
  }
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  border-radius: var(--ui-border-radius-2);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &.block-item-colorful {
    border-color: var(--color-background-faint);
    background-color: var(--color-background-faint);

    &:hover:not(.block-item-active) {
      border-color: var(--color-background);
      background-color: var(--color-background);
    }

    &.block-item-active {
      border-color: var(--color-outline);
      background-color: var(--color-background);
    }
  }

  &.block-item-standard {
    border-color: var(--ui-color-grey-300);
    background-color: var(--ui-color-grey-300);

    &:hover:not(.block-item-active) {
      border-color: var(--ui-color-grey-400);
      background-color: var(--ui-color-grey-400);
    }

    &.block-item-active {
      border-color: var(--color-outline);
      background-color: var(--color-background);
    }
  }
}
</style>
