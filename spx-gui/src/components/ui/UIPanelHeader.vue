<template>
  <div>
    <div class="main">
      <slot></slot>
    </div>
    <NDivider />
  </div>
</template>
<script setup lang="ts">
import { NDivider } from 'naive-ui'
</script>
<style scoped lang="scss">
.n-divider {
  margin: 0;
}

.main {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 500;
}
</style>
