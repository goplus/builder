<!-- Header for Sprite/Sound/Stage Editor -->

<template>
  <div class="editor-header">
    <!-- In the future, there will be tabs here -->
    <div class="main" :style="{ background: color }">
      <slot></slot>
    </div>
    <div class="extra">
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  color: string
}>()
</script>

<style scoped lang="scss">
.editor-header {
  height: 44px;
  display: flex;
  padding-right: var(--ui-gap-middle);
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--ui-color-grey-400);
}
.main {
  height: 100%;
  padding: 0 var(--ui-gap-middle);
  display: flex;
  align-items: center;
  font-size: 16px;
  color: var(--ui-color-grey-100);
}
</style>
