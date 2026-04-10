<script lang="ts">
export type TagVariant = 'stroke' | 'none'
export type TagColor = 'default' | 'primary' | 'warning' | 'error'
export type TagSize = 'small'
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { cn, type ClassValue } from './utils'

import UIIcon from './icons/UIIcon.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
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
const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    'ui-tag',
    `ui-tag-variant-${props.variant}`,
    `ui-tag-color-${props.color}`,
    `ui-tag-size-${props.size}`,
    {
      'ui-tag-checkable': !!props.checkable,
      'ui-tag-checked': props.checkable ? props.checkable.checked : false
    },
    attrs.class as ClassValue | null
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>

<template>
  <button v-bind="rootAttrs" :class="rootClass" :disabled="disabled">
    <slot></slot>
    <UIIcon
      v-if="slots.suffix == null && closable && !disabled"
      class="ui-tag-close-icon"
      type="close"
      @click.stop="emit('close')"
    />
    <slot v-else name="suffix"></slot>
  </button>
</template>

<style>
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
    --ui-tag-color: var(--ui-color-grey-600);
  }
  .ui-tag .ui-tag-close-icon {
    cursor: pointer;
    width: var(--ui-tag-close-icon-size);
    height: var(--ui-tag-close-icon-size);
    color: var(--ui-tag-color);
  }

  .ui-tag .ui-tag-close-icon:hover {
    border-radius: 100%;
  }

  .ui-tag.ui-tag-checkable:not(:disabled):hover,
  .ui-tag.ui-tag-checked:not(:disabled) {
    cursor: pointer;
    --ui-tag-color: var(--ui-color-primary-main);
    --ui-tag-border-color: var(--ui-color-primary-300);
  }

  .ui-tag.ui-tag-checkable:not(:disabled):hover .ui-tag-close-icon:hover,
  .ui-tag.ui-tag-checked:not(:disabled) .ui-tag-close-icon:hover {
    background: var(--ui-color-primary-300);
  }

  .ui-tag.ui-tag-checkable:not(:disabled):hover {
    --ui-tag-bg-color: var(--ui-color-primary-100);
  }

  .ui-tag.ui-tag-checked:not(:disabled) {
    --ui-tag-bg-color: var(--ui-color-primary-200);
  }

  /* variant */
  .ui-tag.ui-tag-variant-stroke {
    border: 1px solid var(--ui-tag-border-color);
    background: var(--ui-tag-bg-color);
  }

  .ui-tag.ui-tag-variant-stroke:disabled {
    --ui-tag-bg-color: var(--ui-color-grey-300);
    --ui-tag-border-color: var(--ui-color-grey-400);
  }

  .ui-tag.ui-tag-variant-none {
    border: none;
    background: none;
  }

  /* color */
  .ui-tag.ui-tag-color-default {
    --ui-tag-color: var(--ui-color-grey-900);
    --ui-tag-bg-color: var(--ui-color-grey-300);
    --ui-tag-border-color: var(--ui-color-grey-400);
  }

  .ui-tag.ui-tag-color-default .ui-tag-close-icon:hover {
    background: var(--ui-color-grey-400);
  }

  .ui-tag.ui-tag-color-primary {
    --ui-tag-color: var(--ui-color-primary-main);
    --ui-tag-bg-color: var(--ui-color-primary-200);
    --ui-tag-border-color: var(--ui-color-primary-300);
  }

  .ui-tag.ui-tag-color-primary .ui-tag-close-icon:hover {
    background: var(--ui-color-primary-300);
  }

  .ui-tag.ui-tag-color-warning {
    --ui-tag-color: var(--ui-color-yellow-500);
    --ui-tag-bg-color: var(--ui-color-yellow-200);
    --ui-tag-border-color: var(--ui-color-yellow-300);
  }

  .ui-tag.ui-tag-color-warning .ui-tag-close-icon:hover {
    background: var(--ui-color-yellow-300);
  }

  .ui-tag.ui-tag-color-error {
    --ui-tag-color: var(--ui-color-red-500);
    --ui-tag-bg-color: var(--ui-color-red-200);
    --ui-tag-border-color: var(--ui-color-red-300);
  }

  .ui-tag.ui-tag-color-error .ui-tag-close-icon:hover {
    background: var(--ui-color-red-300);
  }

  /* size */
  .ui-tag.ui-tag-size-small {
    --ui-tag-padding: 0 8px;
    --ui-tag-height: 20px;
    --ui-tag-font-size: 12px;
    --ui-tag-line-height: 1.5;
    --ui-tag-border-radius: 4px;
    --ui-tag-gap: 4px;
    --ui-tag-close-icon-size: 14px;
  }
}
</style>
