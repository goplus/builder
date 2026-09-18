<template>
  <template v-if="mode === EditMode.Simple">
    <UICard
      v-if="selectedSprite != null"
      v-radar="{ name: 'simple-code-editor', desc: 'Focused code editor for the selected course sprite' }"
      class="relative min-w-0 flex-[3.5_1_0] flex flex-col overflow-visible!"
    >
      <CodeEditorUI :code-file-path="selectedSprite.codeFilePath" simple-mode />
      <div ref="simpleControlsAnchor" class="absolute right-3 bottom-4 z-10"></div>
    </UICard>
    <EditorPlaceholder v-else />
    <div class="min-w-0 flex-[3_1_0] flex flex-col">
      <EditorPreview simple-mode :controls-anchor="simpleControlsAnchor" />
    </div>
  </template>
  <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
  <!-- Using overflow-visible class to avoid cutting dropdown menu of CodeTextEditor (monaco) -->
  <UICard
    v-if="mode !== EditMode.Simple"
    v-show="mode === EditMode.Default"
    v-radar="{
      name: `${selected.type}-editor`,
      desc: `Main editor panel for editing ${selected.type}`
    }"
    class="relative flex-[1_1_0] min-w-0 flex flex-col overflow-visible!"
  >
    <!--
      TODO: optimize performance for switching between editors, which corresponds to selection change.
      There's known issue with Vue `KeepAlive`:
      * It increases difficulty of implementing the inner components.
        For example: we need to listen to extra events (activated/deactivated) to do initialization and cleanup.
      * We use custom directive to capture UI information, which does not work well with KeepAlive.
        For details, see: https://github.com/vuejs/core/issues/2349
    -->
    <SpriteEditor
      v-if="selected.type === 'sprite' && selected.sprite != null"
      :sprite="selected.sprite"
      :state="editorCtx.state.spriteState!"
    />
    <StageEditor v-else-if="selected.type === 'stage'" :stage="project.stage" :state="editorCtx.state.stageState" />
    <EditorPlaceholder v-else />
  </UICard>
  <div
    v-if="mode !== EditMode.Simple"
    v-show="mode === EditMode.Default"
    class="min-w-0 flex-[0_0_496px] flex flex-col gap-xl"
  >
    <EditorPreview />
    <EditorPanels />
  </div>
  <MapEditor
    v-if="mode === EditMode.Map"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UICard } from '@/components/ui'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { EditMode } from './editor-state'
import MapEditor from './map-editor/MapEditor.vue'
import { useSpxEditorCopilot } from './copilot'
import { CodeEditorUI } from './spx-code-editor'

const editorCtx = useEditorCtx()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const mode = computed(() => editorCtx.state.selectedEditMode)
const selectedSprite = computed(() => (selected.value.type === 'sprite' ? selected.value.sprite : null))
const simpleControlsAnchor = ref<HTMLElement | null>(null)

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>
