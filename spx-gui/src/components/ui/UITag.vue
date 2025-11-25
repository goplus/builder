<template>
  <button class="ui-tag" type="button" :class="`type-${type}`">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
export type TagType = 'primary' | 'boring'

defineProps<{
  type: TagType
}>()
</script>

<style lang="scss" scoped>
.ui-tag {
  display: flex;
  width: fit-content;
  align-items: center;
  height: 32px; // TODO: support different sizes
  padding: 0 16px;
  color: var(--ui-color-grey-100);
  background: var(--ui-color-grey-600);
  border: 1px solid var(--ui-color-grey-600);
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;
  white-space: nowrap;
  transition: 0.3s;

  &.type-primary {
    color: var(--ui-color-grey-100);
    background: var(--ui-color-primary-main);
    border-color: var(--ui-color-primary-main);
  }

  &.type-boring {
    color: var(--ui-color-grey-900);
    background: var(--ui-color-grey-300);
    border-color: var(--ui-color-grey-300);
  }
}
</style>
