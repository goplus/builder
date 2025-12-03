<template>
  <div :class="['ui-title-container', size]">
    <span>
      <slot></slot>
    </span>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  size: 'medium' | 'large'
}>()
</script>
<style scoped lang="scss">
.ui-title-container {
  display: flex;
  align-items: center;
  color: var(--ui-color-title);
  width: 100%;

  text-align: center;

  &.medium {
    font-size: 10px;
    line-height: 16px;
  }

  &.large {
    font-size: 13px;
    line-height: 20px;
    height: 32px;
  }

  & > span {
    width: 100%;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0 6px;
  }
}
</style>
