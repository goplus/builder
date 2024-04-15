<template>
  <UIPanel class="container">
    <UIPanelHeader> TODO: Tab Placeholder</UIPanelHeader>
    <SoundEditor v-if="editorCtx.selected?.type === 'sound'" />
    <SpriteEditor v-else-if="editorCtx.selectedSprite != null" :sprite="editorCtx.selectedSprite" />
    <StageEditor
      v-else-if="editorCtx.selected?.type === 'stage'"
      :stage="editorCtx.project.stage"
    />
    <div v-else>TODO</div>
  </UIPanel>
</template>

<script setup lang="ts">
import UIPanel from '../ui/UIPanel.vue'
import UIPanelHeader from '../ui/UIPanelHeader.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.container {
  flex: 1;
}
</style>
