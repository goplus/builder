<template>
  <template v-if="isSimpleMode">
    <UICard
      v-if="simpleSprite != null"
      v-radar="{ name: 'simple-code-editor', desc: 'Focused code editor for the selected course sprite' }"
      class="relative flex-[1_1_0] min-w-0 flex flex-col overflow-visible!"
    >
      <CodeEditorUI :code-file-path="simpleSprite.codeFilePath" simple-mode />
    </UICard>
    <EditorPlaceholder v-else />
    <div class="min-w-0 flex-[0_0_560px] flex flex-col">
      <EditorPreview simple-mode :ruler-visible="rulerVisible" @sprite-name-click="handleSpriteNameClick" />
    </div>
  </template>
  <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
  <!-- Using overflow-visible class to avoid cutting dropdown menu of CodeTextEditor (monaco) -->
  <UICard
    v-if="!isSimpleMode"
    v-show="isPreviewMode"
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
  <div v-if="!isSimpleMode" v-show="isPreviewMode" class="min-w-0 flex-[0_0_496px] flex flex-col gap-xl">
    <EditorPreview />
    <EditorPanels />
  </div>
  <MapEditor
    v-if="isMapMode"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UICard } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { EditMode } from './editor-state'
import MapEditor from './map-editor/MapEditor.vue'
import { useSpxEditorCopilot } from './copilot'
import { CodeEditorUI, useCodeEditor } from './spx-code-editor'

const editorCtx = useEditorCtx()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const isPreviewMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Default)
const isSimpleMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Simple)
const isMapMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Map)
const simpleSprite = computed(() =>
  isSimpleMode.value && selected.value.type === 'sprite' ? selected.value.sprite : null
)
const codeEditor = useCodeEditor()

// Course playground supplies this prop through the existing ProjectEditor
// composition; ordinary project editors keep the ruler hidden.
const props = withDefaults(
  defineProps<{
    rulerVisible?: boolean
  }>(),
  {
    rulerVisible: false
  }
)
const rulerVisible = computed(() => props.rulerVisible)

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}

const handleSpriteNameClick = useMessageHandle((spriteName: string) => codeEditor.insertText(spriteName), {
  en: 'Failed to insert sprite name',
  zh: '插入精灵名称失败'
}).fn
</script>
