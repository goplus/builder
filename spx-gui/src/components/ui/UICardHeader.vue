<template>
  <div>
    <div class="main">
      <slot></slot>
    </div>
    <UIDivider />
  </div>
</template>
<script setup lang="ts">
import { UIDivider } from '@/components/ui'
</script>
<style scoped lang="scss">
.main {
  display: flex;
  align-items: center;
  height: 43px;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 500;
}
</style>
