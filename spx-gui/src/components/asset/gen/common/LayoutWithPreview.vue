<!--
  Layout with a main panel and an optional preview panel.
  Typically used in sprite / backdrop gen UI.
-->

<script setup lang="ts">
defineProps<{
  hasPreview: boolean
}>()
</script>

<template>
  <div
    class="layout-with-preview flex-[1_1_0] min-w-0 flex items-stretch justify-center"
    :class="{ 'has-preview': hasPreview }"
  >
    <section class="main-panel flex flex-col min-w-0 gap-6">
      <slot></slot>
    </section>

    <section class="preview-panel">
      <slot name="preview"></slot>
    </section>
  </div>
</template>

<style scoped>
.layout-with-preview {
  transition: gap 0.2s ease;
}

.main-panel {
  width: 584px;
  justify-content: center;
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
