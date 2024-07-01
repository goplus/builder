<template>
  <li class="block-item" :class="{ active }">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
// TODO: support more variants, see details in https://github.com/goplus/builder/issues/613
withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  {
    active: false
  }
)
</script>

<style lang="scss" scoped>
.block-item {
  flex: 0 0 auto;
  width: 88px;
  height: 88px;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    border-color: var(--ui-color-primary-main);
    background-color: var(--ui-color-primary-200);
  }
}
</style>
