<template>
  <div class="main">
    <SpxEditor />
  </div>
  <div class="sider">
    <SpxStage />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import SpxEditor from './SpxEditor.vue'
import SpxStage from './stage/SpxStage.vue'
import EditorPanels from './panels/EditorPanels.vue'
</script>

<style scoped lang="scss">
.main {
  flex: 1 1 0;
  min-width: 0;
}
.sider {
  flex: 0 0 40%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
