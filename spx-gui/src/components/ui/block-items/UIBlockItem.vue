<template>
  <div
    :class="[
      'block-item',
      active && 'block-item-active',
      interactive && 'block-item-interactive',
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
    interactive?: boolean
  }>(),
  {
    variant: 'standard',
    size: 'medium',
    color: 'primary',
    interactive: true
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
  width: var(--block-item-size);
  height: var(--block-item-size);
  // it may shrink without min-width / min-height
  min-width: var(--block-item-size);
  min-height: var(--block-item-size);
  &.block-item-medium {
    --block-item-size: 88px;
  }
  &.block-item-large {
    --block-item-size: 140px;
  }
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  border-radius: var(--ui-border-radius-2);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);

  &.block-item-interactive {
    cursor: pointer;
  }

  &.block-item-colorful {
    border-color: var(--color-background-faint);
    background-color: var(--color-background-faint);

    &.block-item-interactive:hover:not(.block-item-active) {
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

    &.block-item-interactive:hover:not(.block-item-active) {
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
