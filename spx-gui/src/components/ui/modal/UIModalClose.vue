<template>
  <UIIcon type="close" class="close-btn" />
</template>

<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
</script>

<style scoped lang="scss">
.close-btn {
  margin-left: 12px;
  width: 20px;
  height: 20px;
  color: var(--ui-color-grey-700);
  cursor: pointer;

  // TODO: check colors here
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-900);
  }
}
</style>
