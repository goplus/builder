<!--
  Preview component with a checkerboard background.
  Typically used in costume / animation gen UI within sprite gen.
-->

<script setup lang="ts">
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
</script>

<template>
  <div class="preview-with-checkerboard-bg">
    <CheckerboardBackground class="background" />
    <slot>
      <div class="placeholder">{{ $t({ en: 'Preview area', zh: '预览区域' }) }}</div>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
.preview-with-checkerboard-bg {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-hint-2);
}
</style>
