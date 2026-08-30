<template>
  <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
  <!-- Using overflow-visible class to avoid cutting dropdown menu of CodeTextEditor (monaco) -->
  <UICard
    v-show="isPreviewMode"
    v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
    class="relative min-w-0 flex flex-col overflow-visible!"
    :class="isFocusedLayout || isPortraitLayout ? 'flex-[3.5_1_0]' : 'flex-[1_1_0]'"
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
    v-show="isPreviewMode"
    class="min-w-0 flex gap-xl"
    :class="
      isFocusedLayout
        ? 'flex-[3_1_0] min-w-[660px] flex-col'
        : isPortraitLayout
          ? 'flex-[3_1_0] min-w-[660px] flex-row'
          : 'flex-[0_0_496px] flex-col'
    "
  >
    <EditorPreview :fill-container="isFocusedLayout || isPortraitLayout" />
    <EditorPanels v-if="!isFocusedLayout" :layout="isPortraitLayout ? 'portrait' : 'default'" />
  </div>
  <MapEditor
    v-if="!isPreviewMode"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const props = withDefaults(
  defineProps<{
    layout?: 'landscape' | 'portrait' | 'focused'
  }>(),
  { layout: 'landscape' }
)

const editorCtx = useEditorCtx()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const isPreviewMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Default)
const isFocusedLayout = computed(() => props.layout === 'focused')
const isPortraitLayout = computed(() => props.layout === 'portrait')

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>
