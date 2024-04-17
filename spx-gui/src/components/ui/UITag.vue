<template>
  <button class="ui-tag">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
// Currently only grey tag with shadow is supported
</script>

<style lang="scss" scoped>
.ui-tag {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  color: var(--ui-color-text);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-border);
  border-bottom-width: 3px;
  border-radius: var(--ui-border-radius-2);
  cursor: pointer;

  &:active {
    border-bottom-width: 1px;
  }
}
</style>
