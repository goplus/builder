<template>
  <div class="ui-error">
    <slot></slot>
    <UIIcon v-if="retry != null" class="refresh" type="rotate" @click="retry" />
  </div>
</template>

<script setup lang="ts">
import UIIcon from './icons/UIIcon.vue'

defineProps<{
  retry?: () => unknown
}>()
</script>

<style scoped lang="scss">
// TODO: style not designed yet
.ui-error {
  width: 100%;
  height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ui-color-hint-2);
}

.refresh {
  cursor: pointer;
  transition: color 0.2s;
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-900);
  }
}
</style>
