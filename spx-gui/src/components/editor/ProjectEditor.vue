<template>
  <div
    v-show="isPreviewMode"
    ref="previewColumnRef"
    class="min-w-0 flex flex-none gap-xl"
    :class="[isPortraitRailLayout ? 'flex-row' : 'flex-col', { 'pointer-events-none': resizing != null }]"
    :style="previewColumnStyle"
  >
    <EditorPreview
      class="min-w-0"
      :class="{ 'flex-[1_1_0] self-start': isPortraitRailLayout }"
      :fill-container="isFocusedLayout"
    />
    <EditorPanels
      v-if="!isFocusedLayout"
      :layout="isPortraitRailLayout ? 'portrait' : 'default'"
      :rail-width="paneLayout?.railWidth"
    />
  </div>
  <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
  <!-- Using overflow-visible class to avoid cutting dropdown menu of CodeTextEditor (monaco) -->
  <div
    v-show="isPreviewMode"
    ref="editorColumnRef"
    class="relative min-w-0 flex flex-[1_1_0] flex-col gap-xl"
  >
    <UICard
      id="project-code-pane"
      v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
      class="relative min-h-0 flex flex-[1_1_0] flex-col overflow-visible!"
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
      <StageEditor
        v-else-if="selected.type === 'stage'"
        :stage="project.stage"
        :state="editorCtx.state.stageState"
      />
      <EditorPlaceholder v-else />
    </UICard>
    <div
      v-show="running.mode === 'debug'"
      class="relative min-h-0 flex-none"
      :style="{ height: `${consoleHeight}px` }"
    >
      <div
        v-radar="{ name: 'Console resize handle', desc: 'Drag to resize code and console panels' }"
        role="separator"
        aria-orientation="horizontal"
        :aria-label="$t({ en: 'Resize code and console panels', zh: '调整代码与控制台区域高度' })"
        :aria-valuemin="MIN_CONSOLE_HEIGHT"
        :aria-valuemax="maxConsoleHeight"
        :aria-valuenow="Math.round(consoleHeight)"
        :title="$t({ en: 'Drag to resize', zh: '拖动调整高度' })"
        tabindex="0"
        class="group absolute inset-x-0 -top-4 z-10 h-4 touch-none cursor-row-resize select-none flex items-center justify-center focus-visible:outline-none"
        @pointerdown="startConsoleResizing"
        @keydown="handleConsoleResizeKey"
      >
        <div
          class="h-0.5 w-12 rounded-full bg-grey-500 transition-colors group-hover:bg-primary-main group-focus-visible:bg-primary-main"
          :class="{ 'bg-primary-main!': consoleResizing?.moved }"
        ></div>
      </div>
      <ConsolePanel
        v-radar="{
          name: 'Console panel',
          desc: 'Console panel showing runtime output and errors',
          visible: running.mode === 'debug'
        }"
        class="h-full"
      />
    </div>
    <div
      v-radar="{ name: 'Editor pane resize handle', desc: 'Drag to resize code and preview panels' }"
      role="separator"
      aria-orientation="vertical"
      aria-controls="project-code-pane"
      :aria-label="$t({ en: 'Resize code and preview panels', zh: '调整代码与预览区域宽度' })"
      :aria-valuemin="Math.round(paneLayout?.minCodeWidth ?? 0)"
      :aria-valuemax="Math.round(paneLayout?.maxCodeWidth ?? 0)"
      :aria-valuenow="Math.round(paneLayout?.codeWidth ?? 0)"
      :title="$t({ en: 'Drag to resize; double-click to reset', zh: '拖动调整宽度，双击恢复自动布局' })"
      tabindex="0"
      class="group absolute inset-y-0 -left-4 z-10 w-4 touch-none cursor-col-resize select-none flex items-center justify-center focus-visible:outline-none"
      @pointerdown="startResizing"
      @keydown="handleResizeKey"
      @dblclick="preferredCodeWidths[props.layout] = null"
    >
      <div
        class="h-12 w-0.5 rounded-full bg-grey-500 transition-colors group-hover:bg-primary-main group-focus-visible:bg-primary-main"
        :class="{ 'bg-primary-main!': resizing?.moved }"
      ></div>
    </div>
  </div>
  <!-- Prevent the runner iframe from swallowing pointer events during a drag. -->
  <div
    v-if="resizing?.moved || consoleResizing?.moved"
    class="fixed inset-0 z-50 select-none"
    :class="resizing?.moved ? 'cursor-col-resize' : 'cursor-row-resize'"
  ></div>
  <MapEditor
    v-if="!isPreviewMode"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { useContentSize } from '@/utils/dom'
import { UICard } from '@/components/ui'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import ConsolePanel from './panels/ConsolePanel.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { EditMode } from './editor-state'
import MapEditor from './map-editor/MapEditor.vue'
import { useSpxEditorCopilot } from './copilot'
import { getPaneLayout, type EditorLayout } from './pane-layout'

const props = withDefaults(
  defineProps<{
    layout?: EditorLayout
  }>(),
  { layout: 'landscape' }
)

const editorCtx = useEditorCtx()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const running = computed(() => editorCtx.state.runtime.running)
const isPreviewMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Default)
const isFocusedLayout = computed(() => props.layout === 'focused')
const previewColumnRef = ref<HTMLElement | null>(null)
const editorColumnRef = ref<HTMLElement | null>(null)
const editorSize = useContentSize(() => previewColumnRef.value?.parentElement ?? null)
const editorColumnSize = useContentSize(editorColumnRef)
const preferredCodeWidths = reactive<Record<EditorLayout, number | null>>({
  landscape: null,
  portrait: null,
  focused: null
})
const paneLayout = computed(() => {
  const size = editorSize.value
  if (size == null) return null
  return getPaneLayout(size, project.value.viewportSize, props.layout, preferredCodeWidths[props.layout])
})
const isPortraitRailLayout = computed(() => paneLayout.value?.portraitRail ?? false)
const previewColumnStyle = computed(() => ({ width: `${paneLayout.value?.previewWidth ?? 496}px` }))
const resizing = ref<{ pointerId: number; startX: number; codeWidth: number; moved: boolean } | null>(null)
const MIN_CONSOLE_HEIGHT = 160
const MIN_CODE_HEIGHT = 240
const PANEL_GAP = 16
const preferredConsoleHeight = ref(256)
const maxConsoleHeight = computed(() =>
  Math.max(MIN_CONSOLE_HEIGHT, (editorColumnSize.value?.height ?? 672) - MIN_CODE_HEIGHT - PANEL_GAP)
)
const consoleHeight = computed(() => Math.min(maxConsoleHeight.value, preferredConsoleHeight.value))
const consoleResizing = ref<{ pointerId: number; startY: number; consoleHeight: number; moved: boolean } | null>(
  null
)

function setCodeWidth(width: number) {
  const layout = paneLayout.value
  if (layout == null) return
  preferredCodeWidths[props.layout] = Math.min(layout.maxCodeWidth, Math.max(layout.minCodeWidth, width))
}

function startResizing(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary || paneLayout.value == null) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).focus({ preventScroll: true })
  resizing.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    codeWidth: paneLayout.value.codeWidth,
    moved: false
  }
}

function resizePanes(event: PointerEvent) {
  const drag = resizing.value
  if (drag == null || event.pointerId !== drag.pointerId) return
  if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return
  drag.moved = true
  setCodeWidth(drag.codeWidth - (event.clientX - drag.startX))
}

function stopResizing() {
  resizing.value = null
}

function setConsoleHeight(height: number) {
  preferredConsoleHeight.value = Math.min(maxConsoleHeight.value, Math.max(MIN_CONSOLE_HEIGHT, height))
}

function startConsoleResizing(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).focus({ preventScroll: true })
  consoleResizing.value = {
    pointerId: event.pointerId,
    startY: event.clientY,
    consoleHeight: consoleHeight.value,
    moved: false
  }
}

function resizeConsole(event: PointerEvent) {
  const drag = consoleResizing.value
  if (drag == null || event.pointerId !== drag.pointerId) return
  if (!drag.moved && Math.abs(event.clientY - drag.startY) < 3) return
  drag.moved = true
  setConsoleHeight(drag.consoleHeight - (event.clientY - drag.startY))
}

function stopConsoleResizing() {
  consoleResizing.value = null
}

watchEffect((onCleanup) => {
  if (resizing.value == null) return
  window.addEventListener('pointermove', resizePanes)
  window.addEventListener('pointerup', stopResizing)
  window.addEventListener('pointercancel', stopResizing)
  window.addEventListener('blur', stopResizing)
  onCleanup(() => {
    window.removeEventListener('pointermove', resizePanes)
    window.removeEventListener('pointerup', stopResizing)
    window.removeEventListener('pointercancel', stopResizing)
    window.removeEventListener('blur', stopResizing)
  })
})

watchEffect((onCleanup) => {
  if (consoleResizing.value == null) return
  window.addEventListener('pointermove', resizeConsole)
  window.addEventListener('pointerup', stopConsoleResizing)
  window.addEventListener('pointercancel', stopConsoleResizing)
  window.addEventListener('blur', stopConsoleResizing)
  onCleanup(() => {
    window.removeEventListener('pointermove', resizeConsole)
    window.removeEventListener('pointerup', stopConsoleResizing)
    window.removeEventListener('pointercancel', stopConsoleResizing)
    window.removeEventListener('blur', stopConsoleResizing)
  })
})

function handleResizeKey(event: KeyboardEvent) {
  const layout = paneLayout.value
  if (layout == null || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  setCodeWidth(
    event.key === 'Home'
      ? layout.minCodeWidth
      : event.key === 'End'
        ? layout.maxCodeWidth
        : layout.codeWidth + (event.key === 'ArrowRight' ? -16 : 16)
  )
}

function handleConsoleResizeKey(event: KeyboardEvent) {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  setConsoleHeight(
    event.key === 'Home'
      ? MIN_CONSOLE_HEIGHT
      : event.key === 'End'
        ? maxConsoleHeight.value
        : consoleHeight.value + (event.key === 'ArrowUp' ? 16 : -16)
  )
}

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>
