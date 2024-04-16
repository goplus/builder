<template>
  <button class="ui-button" :class="[`type-${type}`, `size-${size}`]" :type="htmlType">
    <UIIcon v-if="icon != null" class="icon" :type="icon" />
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success'
export type ButtonSize = 'small' | 'middle' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'

withDefaults(
  defineProps<{
    type?: ButtonType
    size?: ButtonSize
    // we may support custom icon later (by slot `icon`)
    icon?: IconType
    htmlType?: ButtonHtmlType
  }>(),
  {
    type: 'primary',
    size: 'middle',
    icon: undefined,
    htmlType: undefined
  }
)
</script>

<style lang="scss" scoped>
.ui-button {
  display: flex;
  height: var(--ui-line-height-2);
  padding: 0 16px;
  align-items: center;
  gap: 4px;

  border: none;
  border-bottom-width: 4px;
  border-bottom-style: solid;
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;

  &:not(:disabled):active {
    border-bottom-width: 0;
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    color: var(--ui-color-grey-600);
    background-color: var(--ui-color-disabled);
    border-bottom-color: var(--ui-color-grey-500);
  }

  .icon {
    width: var(--ui-font-size-text);
    height: var(--ui-font-size-text);
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

.size-large {
  font-size: 15px;
  line-height: 1.6;
  height: var(--ui-line-height-3);
  padding: 0 24px;
  gap: 8px;

  .icon {
    width: 15px;
    height: 15px;
  }
}

.size-small {
  font-size: 13px;
  line-height: 1.5;
  height: var(--ui-line-height-1);
  padding: 0 12px;
  gap: 4px;

  .icon {
    width: 13px;
    height: 13px;
  }
}
</style>
