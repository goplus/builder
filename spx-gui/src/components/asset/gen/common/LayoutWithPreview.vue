<script setup lang="ts">
defineProps<{
  hasPreview: boolean
}>()
</script>

<template>
  <div class="layout-with-preview" :class="{ 'has-preview': hasPreview }">
    <section class="main-panel">
      <slot></slot>
    </section>

    <section class="preview-panel">
      <slot name="preview"></slot>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.layout-with-preview {
  flex: 1 1 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  min-width: 0;
  transition: gap 0.2s ease;
}

.main-panel {
  width: 584px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  min-width: 0;
  transition-property: flex, width, padding;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

.layout-with-preview.has-preview .main-panel {
  width: 416px;
  padding: 20px;
  justify-content: flex-start;
}

.preview-panel {
  flex: 0 0 auto;
  width: 0;
  opacity: 0;
  transform: translateX(-20px);
  pointer-events: none;
  overflow: hidden;
  transition-property: flex, width, padding, opacity, transform;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

.layout-with-preview.has-preview .preview-panel {
  flex: 1 1 0;
  padding: 20px;
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}
</style>
