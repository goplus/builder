<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="config-item-wrapper">
    <div v-if="title" class="label">{{ title }}:</div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.config-item-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;

  .label {
    word-break: keep-all;
  }

  .content {
    flex: 1;
  }
}
</style>
