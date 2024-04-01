<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:30:39
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 17:56:41
 * @FilePath: /builder/spx-gui/src/view/EditorHomepage.vue
 * @Description:
-->
<template>
  <div class="editor-homepage">
    <div class="editor">
      <SpxEditor />
    </div>
    <div class="sider">
      <SpxStage :project="project" />
      <EditorPanels />
    </div>
  </div>
</template>

<script setup lang="ts">
import SpxEditor from './SpxEditor.vue'
import SpxStage from './stage/SpxStage.vue'
import EditorPanels from './panels/EditorPanels.vue'
import { storeToRefs } from 'pinia'
import { useProjectStore, useUserStore } from '@/stores'

const userStore = useUserStore()
if (!userStore.hasSignedIn()) {
  userStore.signInWithRedirection()
}

const projectStore = useProjectStore()
const { project } = storeToRefs(projectStore)
</script>

<style scoped lang="scss">
.editor-homepage {
  width: 100%;
  height: 100%;
  display: flex;
}
.editor {
  flex: 1 1 0;
}
.sider {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
}
</style>
