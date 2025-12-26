<template>
  <div :class="['ui-title-container', size]">
    <span>
      <slot></slot>
    </span>
    <div v-if="slots.suffix != null">
      <slot name="suffix"></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSlots } from 'vue'

defineProps<{
  size: 'medium' | 'large'
}>()

const slots = useSlots()
</script>
<style scoped lang="scss">
.ui-title-container {
  display: flex;
  align-items: center;
  color: var(--ui-color-title);
  width: 100%;
  text-align: center;
  gap: 8px;
  padding: 0 6px;

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
    overflow: hidden;
    flex: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
