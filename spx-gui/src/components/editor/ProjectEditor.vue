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
    ref="previewColumnRef"
    class="min-w-0 flex gap-xl"
    :class="
      isFocusedLayout
        ? 'flex-[3_1_0] min-w-[660px] flex-col'
        : isPortraitRailLayout
          ? 'flex-none flex-row'
          : 'flex-none flex-col'
    "
    :style="previewColumnStyle"
  >
    <EditorPreview
      class="min-w-0"
      :class="{ 'flex-[1_1_0] self-start': isPortraitRailLayout }"
      :fill-container="isFocusedLayout"
    />
    <EditorPanels v-if="!isFocusedLayout" :layout="isPortraitRailLayout ? 'portrait' : 'default'" />
  </div>
  <MapEditor
    v-if="!isPreviewMode"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentSize } from '@/utils/dom'
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
const previewColumnRef = ref<HTMLElement | null>(null)
const editorSize = useContentSize(() => previewColumnRef.value?.parentElement ?? null)
const panelGap = 16
const minEditorWidth = 384
// The preview adds a 48px header and 12px padding around the game canvas.
const previewChromeHeight = 72
const previewPaddingWidth = 24
const portraitRailWidth = 208 + panelGap
const bottomPanelsHeight = 200
const isPortraitRailLayout = computed(() => {
  const size = editorSize.value
  if (!isPortraitLayout.value || size == null) return false
  const { width, height } = project.value.viewportSize
  const stackedPreviewWidth =
    Math.max(0, size.height - previewChromeHeight - panelGap - bottomPanelsHeight) * (width / height) +
    previewPaddingWidth
  const railPreviewWidth = size.width - minEditorWidth - panelGap - portraitRailWidth
  // Move panels below the preview only when doing so gives the game a larger canvas.
  return railPreviewWidth >= stackedPreviewWidth
})
const previewColumnStyle = computed(() => {
  if (isFocusedLayout.value) return null
  const size = editorSize.value
  if (size == null) return { width: '496px' }
  const { width, height } = project.value.viewportSize
  const ratio = width / height
  if (isPortraitLayout.value) {
    const railWidth = isPortraitRailLayout.value ? portraitRailWidth : 0
    const bottomHeight = isPortraitRailLayout.value ? 0 : bottomPanelsHeight + panelGap
    const availableWidth = size.width - minEditorWidth - panelGap - railWidth
    const heightBasedWidth = Math.max(0, size.height - previewChromeHeight - bottomHeight) * ratio + previewPaddingWidth
    return { width: `${Math.max(0, Math.min(availableWidth, heightBasedWidth)) + railWidth}px` }
  }
  // Leave room below a landscape preview for the Sprites/Stage panels or Console.
  const heightBasedWidth =
    Math.max(0, size.height - previewChromeHeight - panelGap - bottomPanelsHeight) * ratio + previewPaddingWidth
  const previewWidth = Math.min(
    640,
    Math.max(360, size.width * 0.4),
    size.width - minEditorWidth - panelGap,
    heightBasedWidth
  )
  return { width: `${Math.max(0, previewWidth)}px` }
})

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>
