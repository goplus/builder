<template>
  <button
    ref="btnRef"
    class="ui-button"
    :class="[
      `variant-${variant}`,
      `shape-${shape}`,
      `color-${color}`,
      `size-${size}`,
      loading && 'loading',
      iconOnly && 'icon-only'
    ]"
    :disabled="disabled"
    :type="htmlType"
  >
    <div class="content">
      <UIIcon v-if="icon != null" class="icon" :type="icon" />
      <slot v-else name="icon"></slot>
      <slot></slot>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonColor = 'primary' | 'secondary' | 'boring' | 'white' | 'danger' | 'success' | 'blue' | 'purple'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'
export type ButtonVariant = 'shadow' | 'flat' | 'stroke'
export type ButtonShape = 'square' | 'circle'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    shape?: ButtonShape
    color?: ButtonColor
    size?: ButtonSize
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: ButtonHtmlType
  }>(),
  {
    variant: 'shadow',
    shape: 'square',
    color: 'primary',
    size: 'medium',
    icon: undefined,
    disabled: false,
    loading: false,
    htmlType: 'button'
  }
)

const disabled = computed(() => props.disabled || props.loading)
const icon = computed(() => (props.loading ? 'loading' : props.icon))
const btnRef = ref<HTMLButtonElement>()

const slots = useSlots()
const iconOnly = computed(() => (props.icon != null || slots.icon != null) && slots.default == null)

defineExpose({
  focus() {
    btnRef.value?.focus()
  }
})
</script>

<style lang="scss" scoped>
// base
.ui-button {
  display: flex;
  align-items: stretch;
  background: none;
  border: none;
  border-radius: var(--ui-button-radius);
  height: var(--ui-button-height);
  cursor: pointer;

  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-primary-main);
  --ui-button-shadow-color: var(--ui-color-primary-700);
  --ui-button-radius: var(--ui-border-radius-2);
  --ui-button-stroke-color: var(--ui-color-grey-400);

  .content {
    flex: 1 1 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--ui-button-content-padding);
    border-radius: var(--ui-button-radius);
    font-size: var(--ui-button-font-size);
    line-height: var(--ui-button-line-height);
    gap: var(--ui-button-gap);
    color: var(--ui-button-color);
    background-color: var(--ui-button-bg-color);
  }

  .icon {
    width: var(--ui-button-icon-size);
    height: var(--ui-button-icon-size);
  }

  &.icon-only {
    aspect-ratio: 1 / 1;
    .content {
      padding: 0;
    }
  }

  &:disabled {
    cursor: not-allowed;

    &:not(.loading) {
      --ui-button-color: var(--ui-color-disabled-text);
      --ui-button-bg-color: var(--ui-color-disabled-bg);
      --ui-button-shadow-color: var(--ui-color-grey-500);
    }
  }
}

// variant
.variant-shadow {
  padding: 0 0 4px 0;

  .content {
    box-shadow: 0 4px var(--ui-button-shadow-color);
  }

  &:not(:disabled):active,
  &.loading {
    padding-bottom: 0;
    .content {
      box-shadow: none;
    }
  }
}

.variant-flat {
  padding: 0;
}

.variant-stroke {
  padding: 0;

  .content {
    border: 1px solid var(--ui-button-stroke-color);
  }
}
// shape
.shape-square {
  --ui-button-radius: var(--ui-border-radius-2);
}

.shape-circle {
  --ui-button-radius: 100%;
}

// color
.color-primary {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-primary-main);
  --ui-button-shadow-color: var(--ui-color-primary-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-primary-400);
  }
}

.color-secondary {
  --ui-button-color: var(--ui-color-primary-main);
  --ui-button-bg-color: var(--ui-color-primary-200);
  --ui-button-shadow-color: var(--ui-color-primary-300);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-primary-100);
  }
}

.color-boring {
  --ui-button-color: var(--ui-color-text);
  --ui-button-bg-color: var(--ui-color-grey-300);
  --ui-button-shadow-color: var(--ui-color-grey-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-grey-200);
  }
}

.color-white {
  --ui-button-color: var(--ui-color-text);
  --ui-button-bg-color: var(--ui-color-grey-100);
  --ui-button-shadow-color: var(--ui-color-grey-400);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-grey-300);
  }
}

.color-danger {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-danger-main);
  --ui-button-shadow-color: var(--ui-color-danger-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-danger-400);
  }
}

.color-success {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-success-main);
  --ui-button-shadow-color: var(--ui-color-success-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-success-400);
  }
}

.color-blue {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-blue-main);
  --ui-button-shadow-color: var(--ui-color-blue-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-blue-400);
  }
}

.color-purple {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-purple-main);
  --ui-button-shadow-color: var(--ui-color-purple-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-purple-400);
  }
}

// size
.size-large {
  --ui-button-height: var(--ui-line-height-3);
  --ui-button-icon-size: 18px;
  --ui-button-content-padding: 0 24px;
  --ui-button-font-size: 15px;
  --ui-button-gap: 8px;
  --ui-button-line-height: 1.6;

  &.variant-flat,
  &.variant-stroke {
    --ui-button-icon-size: 20px;
  }
}

.size-medium {
  --ui-button-height: var(--ui-line-height-2);
  --ui-button-icon-size: 14px;
  --ui-button-content-padding: 0 16px;
  --ui-button-font-size: 14px;
  --ui-button-gap: 4px;
  --ui-button-line-height: 1.5;

  &.variant-flat,
  &.variant-stroke {
    --ui-button-icon-size: 16px;
  }
}

.size-small {
  --ui-button-height: var(--ui-line-height-1);
  --ui-button-icon-size: 13px;
  --ui-button-content-padding: 0 12px;
  --ui-button-font-size: 13px;
  --ui-button-gap: 4px;
  --ui-button-line-height: 1.5;
}
</style>
