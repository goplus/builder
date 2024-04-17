<template>
  <div class="main">
    <SpxEditor />
  </div>
  <div class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import SpxEditor from './SpxEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
</script>

<style scoped lang="scss">
.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}
.sider {
  flex: 0 0 40%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
