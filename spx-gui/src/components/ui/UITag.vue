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
    checkable?: boolean
    checked?: boolean
  }>(),
  {
    variant: 'stroke',
    color: 'default',
    size: 'small',
    disabled: false,
    closable: false,
    checkable: false,
    checked: false
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
    :class="[`variant-${variant}`, `color-${color}`, `size-${size}`, { checkable, checked: checkable && checked }]"
    :disabled="disabled"
  >
    <slot></slot>
    <UIIcon
      v-if="slots.suffix == null && closable && !disabled"
      class="close-icon"
      type="close"
      @click.stop="emit('close')"
    />
    <slot v-else name="suffix"></slot>
  </button>
</template>

<style lang="scss" scoped>
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

  &:active,
  &:focus {
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    --ui-tag-color: var(--ui-color-grey-600);
  }

  .close-icon {
    cursor: pointer;
    width: var(--ui-tag-close-icon-size);
    height: var(--ui-tag-close-icon-size);
    color: var(--ui-tag-color);

    &:hover {
      border-radius: 100%;
    }
  }

  &.checkable:not(:disabled):hover,
  &.checked:not(:disabled) {
    cursor: pointer;
    --ui-tag-color: var(--ui-color-primary-main);
    --ui-tag-border-color: var(--ui-color-primary-300);

    .close-icon:hover {
      background: var(--ui-color-primary-300);
    }
  }

  &.checkable:not(:disabled):hover {
    --ui-tag-bg-color: var(--ui-color-primary-100);
  }

  &.checked:not(:disabled) {
    --ui-tag-bg-color: var(--ui-color-primary-200);
  }
}

// variant
.variant-stroke {
  border: 1px solid var(--ui-tag-border-color);
  background: var(--ui-tag-bg-color);

  &:disabled {
    --ui-tag-bg-color: var(--ui-color-grey-300);
    --ui-tag-border-color: var(--ui-color-grey-400);
  }
}

.variant-none {
  border: none;
  background: none;
}

// color
.color-default {
  --ui-tag-color: var(--ui-color-grey-900);
  --ui-tag-bg-color: var(--ui-color-grey-300);
  --ui-tag-border-color: var(--ui-color-grey-400);

  .close-icon:hover {
    background: var(--ui-color-grey-400);
  }
}

.color-primary {
  --ui-tag-color: var(--ui-color-primary-main);
  --ui-tag-bg-color: var(--ui-color-primary-200);
  --ui-tag-border-color: var(--ui-color-primary-300);

  .close-icon:hover {
    background: var(--ui-color-primary-300);
  }
}

.color-warning {
  --ui-tag-color: var(--ui-color-yellow-500);
  --ui-tag-bg-color: var(--ui-color-yellow-200);
  --ui-tag-border-color: var(--ui-color-yellow-300);

  .close-icon:hover {
    background: var(--ui-color-yellow-300);
  }
}

.color-error {
  --ui-tag-color: var(--ui-color-red-500);
  --ui-tag-bg-color: var(--ui-color-red-200);
  --ui-tag-border-color: var(--ui-color-red-300);

  .close-icon:hover {
    background: var(--ui-color-red-300);
  }
}

// size
.size-small {
  --ui-tag-padding: 0 8px;
  --ui-tag-height: 20px;
  --ui-tag-font-size: 12px;
  --ui-tag-line-height: 1.5;
  --ui-tag-border-radius: 4px;
  --ui-tag-gap: 4px;
  --ui-tag-close-icon-size: 14px;
}
</style>
