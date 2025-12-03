<template>
  <button
    ref="btnRef"
    class="ui-button"
    :class="[
      `style-${style}`,
      `shape-${shape}`,
      `type-${type}`,
      `size-${size}`,
      loading && 'loading',
      stroke && 'stroke',
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
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success' | 'blue' | 'purple'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'
export type ButtonStyle = 'shadow' | 'flat'
export type ButtonShape = 'square' | 'circle'

const props = withDefaults(
  defineProps<{
    style?: ButtonStyle
    shape?: ButtonShape
    type?: ButtonType
    size?: ButtonSize
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: ButtonHtmlType
    stroke?: boolean
  }>(),
  {
    style: 'shadow',
    shape: 'square',
    type: 'primary',
    size: 'medium',
    icon: undefined,
    disabled: false,
    loading: false,
    stroke: false,
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
    border-radius: var(--ui-button-radius);

    color: var(--ui-button-color);
    background-color: var(--ui-button-bg-color);
  }

  &.stroke {
    border: 1px solid var(--ui-button-stroke-color);
  }

  &.icon-only {
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

// style
.ui-button.style-shadow {
  padding: 0 0 4px 0;

  .content {
    box-shadow: 0 4px var(--ui-button-shadow-color);
  }

  &.stroke {
    border: none;
  }

  &:not(:disabled):active,
  &.loading {
    padding-bottom: 0;
    .content {
      box-shadow: none;
    }
  }
}

.ui-button.style-flat {
  padding: 0;
}

// shape
.ui-button.shape-square {
  --ui-button-radius: var(--ui-border-radius-2);
}

.ui-button.shape-circle {
  --ui-button-radius: 100%;
}

// type
.type-primary {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-primary-main);
  --ui-button-shadow-color: var(--ui-color-primary-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-primary-400);
  }
}

.type-secondary {
  --ui-button-color: var(--ui-color-primary-main);
  --ui-button-bg-color: var(--ui-color-primary-200);
  --ui-button-shadow-color: var(--ui-color-primary-300);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-primary-100);
  }
}

.type-boring {
  --ui-button-color: var(--ui-color-text);
  --ui-button-bg-color: var(--ui-color-grey-300);
  --ui-button-shadow-color: var(--ui-color-grey-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-grey-200);
  }
}

.type-danger {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-danger-main);
  --ui-button-shadow-color: var(--ui-color-danger-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-danger-400);
  }
}

.type-success {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-success-main);
  --ui-button-shadow-color: var(--ui-color-success-600);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-success-400);
  }
}

.type-blue {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-blue-main);
  --ui-button-shadow-color: var(--ui-color-blue-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-blue-400);
  }
}

.type-purple {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-purple-main);
  --ui-button-shadow-color: var(--ui-color-purple-700);

  &:hover:not(:active, :disabled) {
    --ui-button-bg-color: var(--ui-color-purple-400);
  }
}

// size
.ui-button.size-large {
  height: var(--ui-line-height-3);

  .content {
    font-size: 15px;
    line-height: 1.6;
    padding: 0 24px;
    gap: 8px;
  }

  .icon {
    width: 18px;
    height: 18px;
  }

  &.icon-only {
    width: var(--ui-line-height-3);
    .content {
      padding: 0;
    }
  }
}

.ui-button.size-medium {
  height: var(--ui-line-height-2);

  .content {
    font-size: 14px;
    line-height: 1.5;
    padding: 0 16px;
    gap: 4px;
  }

  .icon {
    width: 14px;
    height: 14px;
  }

  &.icon-only {
    width: var(--ui-line-height-2);
    .content {
      padding: 0;
    }
  }
}

.ui-button.size-small {
  height: var(--ui-line-height-1);

  .content {
    font-size: 13px;
    line-height: 1.5;
    padding: 0 12px;
    gap: 4px;
  }

  .icon {
    width: 13px;
    height: 13px;
  }

  &.icon-only {
    width: var(--ui-line-height-1);
    .content {
      padding: 0;
    }
  }
}
</style>
