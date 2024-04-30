<template>
  <div :class="['ui-modal-close', `size-${size}`]">
    <UIIcon type="close" class="icon" />
  </div>
</template>

<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'

withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'medium'
  }
)
</script>

<style scoped lang="scss">
.ui-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--ui-color-grey-700);
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }
  &:active {
    background-color: var(--ui-color-grey-500);
  }

  &.size-medium {
    width: 28px;
    height: 28px;

    .icon {
      width: 20px;
      height: 20px;
    }
  }

  &.size-large {
    width: 32px;
    height: 32px;

    .icon {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
