<template>
  <UICard class="main">
    <SoundEditor v-if="editorCtx.selectedSound != null" :sound="editorCtx.selectedSound" />
    <SpriteEditor v-else-if="editorCtx.selectedSprite != null" :sprite="editorCtx.selectedSprite" />
    <StageEditor
      v-else-if="editorCtx.selected?.type === 'stage'"
      :stage="editorCtx.project.stage"
    />
    <UIEmpty v-else>
      {{ $t({ en: 'Add or select a target to start', zh: '添加或选择一个编辑对象' }) }}
    </UIEmpty>
  </UICard>
  <div class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import { UICard, UIEmpty } from '@/components/ui'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import { useEditorCtx } from './EditorContextProvider.vue'

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sider {
  flex: 0 0 492px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
