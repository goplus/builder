<script setup lang="ts">
import GenLoading from '../common/GenLoading.vue'
import { useImageSelectorCompact } from '../common/ImageSelector.vue'

const compact = useImageSelectorCompact()
</script>

<template>
  <li class="backdrop-loading-image-item" :class="{ compact }">
    <GenLoading animation-style="width: 60px; height: 60px;" />
  </li>
</template>

<style lang="scss" scoped>
.backdrop-loading-image-item {
  display: flex;
  width: 140px;
  height: 108px;
  padding: 4px;
  border-radius: 12px;
  background-color: var(--ui-color-grey-300);
  align-items: center;
  justify-content: center;

  transition:
    width 0.2s ease,
    height 0.2s ease,
    border-radius 0.2s ease;

  &.compact {
    width: 88px;
    height: 68px;
    border-radius: 8px;
  }
}
</style>
