<!-- Button that contains icon only -->

<template>
  <button
    class="ui-icon-button"
    :class="[`type-${type}`, loading && 'loading']"
    type="button"
    :disabled="disabled"
  >
    <div class="icon">
      <UIIcon v-if="icon != null" class="ui-icon" :type="icon" />
      <slot v-else name="default"></slot>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success'

const props = withDefaults(
  defineProps<{
    type?: ButtonType
    // we can use `<UIIconButton icon="play" />` or `<UIIconButton><SomeCustomIcon /></UIIconButton>`
    icon: IconType
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    type: 'primary',
    icon: undefined,
    disabled: false,
    loading: false
  }
)

// TODO: loading style for Button is not designed yet.
// We use disabled to indicate loading tempararily.
const disabled = computed(() => props.disabled || props.loading)
const icon = computed(() => (props.loading ? 'loading' : props.icon))
</script>

<style lang="scss" scoped>
.ui-icon-button {
  display: flex;
  width: var(--ui-line-height-3);
  height: var(--ui-line-height-3);
  align-items: center;
  justify-content: center;

  border: none;
  border-bottom-width: 4px;
  border-bottom-style: solid;
  border-radius: var(--ui-line-height-3);
  cursor: pointer;

  &:not(:disabled):active {
    border-bottom-width: 0;
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    color: var(--ui-color-disabled-text);
    background-color: var(--ui-color-disabled-bg);
    border-bottom-color: var(--ui-color-grey-500);
  }

  .icon {
    width: 20px;
    height: 20px;
    display: flex;

    & > :deep(*) {
      width: 100%;
      height: 100%;
    }
  }

  &.loading .icon {
    animation: button-icon-spin 1s linear infinite;
    @keyframes button-icon-spin {
      from {
        transform-origin: 50% 50%;
        transform: rotate(0);
      }
      to {
        transform-origin: 50% 50%;
        transform: rotate(360deg);
      }
    }
  }
}

.type-primary {
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-primary-main);
  border-bottom-color: var(--ui-color-primary-700);

  &:hover:not(:active) {
    background-color: var(--ui-color-primary-400);
  }
}

.type-secondary {
  color: var(--ui-color-primary-main);
  background-color: var(--ui-color-primary-200);
  border-bottom-color: var(--ui-color-primary-300);

  &:hover:not(:active) {
    background-color: var(--ui-color-primary-100);
  }
}

.type-boring {
  color: var(--ui-color-text);
  background-color: var(--ui-color-grey-300);
  border-bottom-color: var(--ui-color-grey-600);

  &:hover:not(:active) {
    background-color: var(--ui-color-grey-200);
  }
}

.type-danger {
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-danger-main);
  border-bottom-color: var(--ui-color-danger-300);

  &:hover:not(:active) {
    background-color: var(--ui-color-danger-100);
  }
}

.type-success {
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-success-main);
  border-bottom-color: var(--ui-color-success-300);

  &:hover:not(:active) {
    background-color: var(--ui-color-success-100);
  }
}
</style>
