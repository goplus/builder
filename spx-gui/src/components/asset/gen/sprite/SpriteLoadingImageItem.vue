<script setup lang="ts">
import { UILoading } from '@/components/ui'
</script>

<template>
  <UILoading class="sprite-loading-image-item" />
</template>

<style lang="scss" scoped>
.sprite-loading-image-item {
  display: flex;
  width: 140px;
  height: 140px;
  padding: 4px;
  border-radius: 12px;
  background-color: var(--ui-color-grey-300);
}
</style>
