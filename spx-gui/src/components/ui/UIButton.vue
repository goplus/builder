<template>
  <button class="ui-button" :class="`type-${type}`">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
type ButtonType = 'primary' | 'secondary' | 'boring' | 'danger' | 'success'

const props = withDefaults(defineProps<{
  type?: ButtonType
}>(), {
  type: 'primary'
})
</script>

<style lang="scss" scoped>
.ui-button {
  display: flex;
  height: var(--ui-line-height-1);
  padding: 0 var(--ui-gap-middle);
  align-items: center;

  border: none;
  border-bottom-width: 4px;
  border-bottom-style: solid;
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;

  &:not(:disabled):active {
    border-bottom-width: 0;
  }

  &:disabled, &:disabled:hover {
    cursor: not-allowed;
    color: var(--ui-color-grey-600);
    background-color: var(--ui-color-disabled);
    border-bottom-color: var(--ui-color-grey-500);
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

.type-boring {
  color: var(--ui-color-text);
  background-color: var(--ui-color-grey-300);
  border-bottom-color: var(--ui-color-grey-600);

  &:hover:not(:active) {
    background-color: var(--ui-color-grey-200);
  }
}

// TODO: other types

</style>
