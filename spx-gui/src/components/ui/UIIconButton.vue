<template>
  <button class="ui-icon-button" :class="`type-${type}`">
    <div class="icon">
      <UIIcon v-if="icon != null" class="ui-icon" :type="icon" />
      <slot name="default"></slot>
    </div>
  </button>
</template>

<script setup lang="ts">
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
export type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success'

withDefaults(
  defineProps<{
    type?: ButtonType
    // we can use `<UIIconButton icon="play" />` or `<UIIconButton><SomeCustomIcon /></UIIconButton>`
    icon: IconType
  }>(),
  {
    type: 'primary',
    icon: undefined
  }
)
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
    color: var(--ui-color-grey-600);
    background-color: var(--ui-color-disabled);
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
