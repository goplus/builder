<template>
  <div class="ui-modal-close">
    <UIIcon type="close" class="icon" />
  </div>
</template>

<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
</script>

<style scoped lang="scss">
.ui-modal-close {
  margin-left: 8px;
  width: 28px;
  height: 28px;
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
}

.icon {
  width: 20px;
  height: 20px;
}
</style>
