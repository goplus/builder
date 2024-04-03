<template>
  <div class="editor-homepage">
    <div class="editor">
      <SpxEditor />
    </div>
    <div class="sider">
      <SpxStage :project="projectStore.project" />
      <EditorPanels />
    </div>
  </div>
</template>

<script setup lang="ts">
import SpxEditor from './SpxEditor.vue'
import SpxStage from './stage/SpxStage.vue'
import EditorPanels from './panels/EditorPanels.vue'
import { useProjectStore, useUserStore } from '@/stores'
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { watch } from 'vue'

const userStore = useUserStore()
watchEffect(() => {
  // This will be called on mount and whenever userStore changes,
  // which are the cases when userStore.signOut() is called
  if (!userStore.hasSignedIn()) {
    userStore.signInWithRedirection()
  }
})

const projectStore = useProjectStore()
const route = useRoute()

watch(
  () => route.params.projectName,
  (name) => {
    if (!name) return
    const owner = userStore.userInfo?.name
    if (!owner) return
    projectStore.openProject(owner, name as string)
  }
)
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
