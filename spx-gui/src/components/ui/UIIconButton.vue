<!-- Button that contains icon only -->

<template>
  <button
    class="ui-icon-button"
    :class="[`type-${type}`, loading && 'loading', `size-${size}`]"
    type="button"
    :disabled="disabled"
  >
    <div class="content">
      <div class="icon">
        <UIIcon v-if="icon != null" class="ui-icon" :type="icon" />
        <slot v-else name="default"></slot>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success' | 'info'
export type ButtonSize = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    type?: ButtonType
    // we can use `<UIIconButton icon="play" />` or `<UIIconButton><SomeCustomIcon /></UIIconButton>`
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    size?: ButtonSize
  }>(),
  {
    type: 'primary',
    icon: undefined,
    disabled: false,
    loading: false,
    size: 'medium'
  }
)

const disabled = computed(() => props.disabled || props.loading)
const icon = computed(() => (props.loading ? 'loading' : props.icon))
</script>

<style lang="scss" scoped>
.ui-icon-button {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: stretch;

  padding: 0 0 4px 0;
  background: none;
  border: none;
  border-radius: 100%;
  cursor: pointer;

  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-primary-main);
  --ui-button-shadow-color: var(--ui-color-primary-700);

  .content {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 100%;

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

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;

    &:not(.loading) {
      --ui-button-color: var(--ui-color-disabled-text);
      --ui-button-bg-color: var(--ui-color-disabled-bg);
      --ui-button-shadow-color: var(--ui-color-grey-500);
    }
  }

  .icon {
    width: 22px;
    height: 22px;
    display: flex;

    & > :deep(*) {
      width: 100%;
      height: 100%;
    }
  }

  &:focus {
    outline: 2px solid var(--ui-color-primary-700);
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

.size-large {
  width: 56px;
  height: 56px;

  .icon {
    width: 28px;
    height: 28px;
  }
}

.type-secondary {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-blue-500);
  --ui-button-shadow-color: var(--ui-color-blue-700);

  &:hover:not(:active) {
    --ui-button-bg-color: var(--ui-color-blue-400);
  }
}

.type-boring {
  --ui-button-color: var(--ui-color-text);
  --ui-button-bg-color: var(--ui-color-grey-300);
  --ui-button-shadow-color: var(--ui-color-grey-600);

  &:hover:not(:active) {
    --ui-button-bg-color: var(--ui-color-grey-200);
  }
}

.type-danger {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-danger-main);
  --ui-button-shadow-color: var(--ui-color-danger-600);

  &:hover:not(:active) {
    --ui-button-bg-color: var(--ui-color-danger-400);
  }
}

.type-success {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-success-main);
  --ui-button-shadow-color: var(--ui-color-success-600);

  &:hover:not(:active) {
    --ui-button-bg-color: var(--ui-color-success-400);
  }
}

.type-info {
  --ui-button-color: var(--ui-color-grey-100);
  --ui-button-bg-color: var(--ui-color-purple-500);
  --ui-button-shadow-color: var(--ui-color-purple-700);

  &:hover:not(:active) {
    --ui-button-bg-color: var(--ui-color-purple-400);
  }
}
</style>
