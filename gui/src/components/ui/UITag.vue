<script lang="ts">
export type TagVariant = 'stroke' | 'none'
export type TagColor = 'default' | 'primary' | 'warning' | 'error'
export type TagSize = 'small'
</script>

<script setup lang="ts">
import { useSlots } from 'vue'

import UIIcon from './icons/UIIcon.vue'

withDefaults(
  defineProps<{
    variant?: TagVariant
    color?: TagColor
    size?: TagSize
    disabled?: boolean
    closable?: boolean
    checkable?: false | { checked: boolean }
  }>(),
  {
    variant: 'stroke',
    color: 'default',
    size: 'small',
    disabled: false,
    closable: false,
    checkable: false
  }
)

const emit = defineEmits<{
  close: []
}>()

const slots = useSlots()
</script>

<template>
  <button
    class="ui-tag"
    :class="[
      `variant-${variant}`,
      `color-${color}`,
      `size-${size}`,
      {
        checkable: !!checkable,
        checked: checkable ? checkable.checked : false
      }
    ]"
    :disabled="disabled"
  >
    <slot></slot>
    <UIIcon
      v-if="slots.suffix == null && closable && !disabled"
      class="close-icon w-3.5 h-3.5"
      type="close"
      @click.stop="emit('close')"
    />
    <slot v-else name="suffix"></slot>
  </button>
</template>

<style scoped>
@layer components {
  .ui-tag {
    display: flex;
    width: fit-content;
    align-items: center;
    height: var(--ui-tag-height);
    padding: var(--ui-tag-padding);
    color: var(--ui-tag-color);
    border-radius: var(--ui-tag-border-radius);
    font-size: var(--ui-tag-font-size);
    line-height: var(--ui-tag-line-height);
    gap: var(--ui-tag-gap);
    white-space: nowrap;
    transition:
      background-color 0.3s,
      border-color 0.3s,
      color 0.3s;
  }

  .ui-tag:active,
  .ui-tag:focus {
    outline: none;
  }

  .ui-tag:disabled {
    cursor: not-allowed;
    --ui-tag-color: var(--ui-color-grey-600) !important;
  }
  .ui-tag .close-icon {
    cursor: pointer;
    color: var(--ui-tag-color);
  }

  .ui-tag .close-icon:hover {
    border-radius: 100%;
  }

  .ui-tag.checkable:not(:disabled):hover,
  .ui-tag.checked:not(:disabled) {
    cursor: pointer;
    --ui-tag-color: var(--ui-color-primary-main);
    --ui-tag-border-color: var(--ui-color-primary-300);
  }

  .ui-tag.checkable:not(:disabled):hover .close-icon:hover,
  .ui-tag.checked:not(:disabled) .close-icon:hover {
    background: var(--ui-color-primary-300);
  }

  .ui-tag.checkable:not(:disabled):hover {
    --ui-tag-bg-color: var(--ui-color-primary-100);
  }

  .ui-tag.checked:not(:disabled) {
    --ui-tag-bg-color: var(--ui-color-primary-200);
  }

  /* variant */
  .ui-tag.variant-stroke {
    border: 1px solid var(--ui-tag-border-color);
    background: var(--ui-tag-bg-color);
  }

  .ui-tag.variant-stroke:disabled {
    --ui-tag-bg-color: var(--ui-color-grey-300);
    --ui-tag-border-color: var(--ui-color-grey-400);
  }

  .ui-tag.variant-none {
    border: none;
    background: none;
  }

  /* color */
  .ui-tag.color-default {
    --ui-tag-color: var(--ui-color-grey-900);
    --ui-tag-bg-color: var(--ui-color-grey-300);
    --ui-tag-border-color: var(--ui-color-grey-400);
  }

  .ui-tag.color-default .close-icon:hover {
    background: var(--ui-color-grey-400);
  }

  .ui-tag.color-primary {
    --ui-tag-color: var(--ui-color-primary-main);
    --ui-tag-bg-color: var(--ui-color-primary-200);
    --ui-tag-border-color: var(--ui-color-primary-300);
  }

  .ui-tag.color-primary .close-icon:hover {
    background: var(--ui-color-primary-300);
  }

  .ui-tag.color-warning {
    --ui-tag-color: var(--ui-color-yellow-500);
    --ui-tag-bg-color: var(--ui-color-yellow-200);
    --ui-tag-border-color: var(--ui-color-yellow-300);
  }

  .ui-tag.color-warning .close-icon:hover {
    background: var(--ui-color-yellow-300);
  }

  .ui-tag.color-error {
    --ui-tag-color: var(--ui-color-red-500);
    --ui-tag-bg-color: var(--ui-color-red-200);
    --ui-tag-border-color: var(--ui-color-red-300);
  }

  .ui-tag.color-error .close-icon:hover {
    background: var(--ui-color-red-300);
  }

  /* size */
  .ui-tag.size-small {
    --ui-tag-padding: 0 8px;
    --ui-tag-height: 20px;
    --ui-tag-font-size: 12px;
    --ui-tag-line-height: 1.5;
    --ui-tag-border-radius: 4px;
    --ui-tag-gap: 4px;
  }
}
</style>
