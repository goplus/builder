<template>
  <button
    ref="btnRef"
    class="ui-button"
    :class="[`type-${type}`, `size-${size}`, loading && 'loading']"
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
import { computed, ref } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    type?: ButtonType
    size?: ButtonSize
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: ButtonHtmlType
  }>(),
  {
    type: 'primary',
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

defineExpose({
  focus() {
    btnRef.value?.focus()
  }
})
</script>

<style lang="scss" scoped>
.ui-button {
  display: flex;
  align-items: stretch;
  height: var(--ui-line-height-2);
  padding: 0 0 4px 0;
  background: none;
  border: none;
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;

  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-primary-main);
  --ui-button-shadow-color: var(--ui-color-primary-700);

  .content {
    flex: 1 1 0;
    display: flex;
    padding: 0 16px;
    justify-content: center;
    align-items: center;
    gap: 4px;
    border-radius: var(--ui-border-radius-2);

    color: var(--ui-button-color);
    background-color: var(--ui-button-bg-color);
    box-shadow: 0 4px var(--ui-button-shadow-color);
  }

  &:not(:disabled):active,
  &.loading {
    padding-bottom: 0;
    .content {
      box-shadow: none;
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

  .icon {
    width: var(--ui-font-size-text);
    height: var(--ui-font-size-text);
  }
}

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

.ui-button.size-large {
  height: var(--ui-line-height-3);

  .content {
    font-size: 15px;
    line-height: 1.6;
    padding: 0 24px;
    gap: 8px;
  }

  .icon {
    width: 15px;
    height: 15px;
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
}
</style>
