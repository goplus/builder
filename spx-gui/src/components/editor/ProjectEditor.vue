<template>
  <UICard class="main">
    <SoundEditor
      v-if="editorCtx.project.selectedSound != null"
      :sound="editorCtx.project.selectedSound"
    />
    <SpriteEditor
      v-else-if="editorCtx.project.selectedSprite != null"
      ref="spriteCodeEditor"
      :sprite="editorCtx.project.selectedSprite"
    />
    <StageEditor
      v-else-if="editorCtx.project.selected?.type === 'stage'"
      ref="stageCodeEditor"
      :stage="editorCtx.project.stage"
    />
    <EditorPlaceholder v-else />
  </UICard>
  <div class="sider">
    <EditorPreview v-if="!editorCtx.debugProject" />
    <DebugPreview v-else :project="editorCtx.project" />

    <EditorPanels v-if="!editorCtx.debugProject" />
    <DebugInfoPanels v-else :project="editorCtx.project" @jump-code="handleJumpCode" />
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
import DebugInfoPanels from './panels/DebugInfoPanels.vue'
import DebugPreview from './preview/DebugPreview.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import type { Position } from '@/models/runtime'
import { ref } from 'vue'
import CodeEditor from '@/components/editor/code-editor/CodeEditor.vue'

const editorCtx = useEditorCtx()
const spriteCodeEditor = ref<InstanceType<typeof CodeEditor>>()
const stageCodeEditor = ref<InstanceType<typeof CodeEditor>>()

function handleJumpCode(target: 'stage' | 'sprite', name: string, position: Position) {
  switch (target) {
    case 'sprite': {
      editorCtx.project.select({
        name,
        type: 'sprite'
      })
      spriteCodeEditor.value?.jump(position)
      break
    }
    case 'stage': {
      editorCtx.project.select({
        type: 'stage'
      })
      stageCodeEditor.value?.jump(position)
      break
    }
  }
}
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
