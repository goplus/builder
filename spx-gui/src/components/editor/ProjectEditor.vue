<template>
  <UICard class="main">
    <SoundEditor
      v-if="editorCtx.project.selectedSound != null"
      :sound="editorCtx.project.selectedSound"
    />
    <SpriteEditor
      v-else-if="editorCtx.project.selectedSprite != null"
      :sprite="editorCtx.project.selectedSprite"
    />
    <StageEditor
      v-else-if="editorCtx.project.selected?.type === 'stage'"
      :stage="editorCtx.project.stage"
    />
    <EditorPlaceholder v-else />
  </UICard>
  <div class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.main {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible; // avoid cutting dropdown menu of CodeTextEditor (monaco)
}
.sider {
  flex: 0 0 492px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
