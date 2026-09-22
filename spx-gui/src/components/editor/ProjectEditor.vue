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
  <UICard
    v-show="isPreviewMode"
    id="project-code-pane"
    v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
    class="relative min-w-0 flex flex-[1_1_0] flex-col overflow-visible!"
    :style="{ userSelect: isConsoleResizing ? 'none' : undefined }"
  >
    <div class="min-h-0 flex flex-[1_1_0] flex-col">
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
    </div>
    <div
      v-show="running.mode === 'debug'"
      class="absolute inset-x-0 bottom-0 z-20 min-h-0 border-t border-t-dividing-line-2 bg-grey-100"
      :style="{ height: `${consoleHeight}px` }"
    >
      <div
        ref="consoleResizeHandleEl"
        v-radar="{ name: 'Console resize handle', desc: 'Drag to resize code and console panels' }"
        role="separator"
        aria-orientation="horizontal"
        :aria-label="$t({ en: 'Resize code and console panels', zh: '调整代码与控制台区域高度' })"
        :aria-valuemin="MIN_CONSOLE_HEIGHT"
        :aria-valuemax="maxConsoleHeight"
        :aria-valuenow="Math.round(consoleHeight)"
        :title="$t({ en: 'Drag to resize', zh: '拖动调整高度' })"
        tabindex="0"
        class="absolute inset-x-0 -top-1.75 z-10 h-3.25 cursor-row-resize transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none"
        :class="{ 'bg-black/10': isConsoleResizing }"
        @keydown="handleConsoleResizeKey"
      ></div>
      <ConsolePanel class="h-full" />
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
  </UICard>
  <!-- Prevent the runner iframe from swallowing pointer events during a drag. -->
  <div v-if="resizing?.moved" class="fixed inset-0 z-50 cursor-col-resize select-none"></div>
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
import { getCleanupSignal } from '@/utils/disposable'
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
const editorSize = useContentSize(() => previewColumnRef.value?.parentElement ?? null)
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
const preferredConsoleHeight = ref(256)
const maxConsoleHeight = computed(() =>
  Math.max(MIN_CONSOLE_HEIGHT, (editorSize.value?.height ?? 672) - MIN_CODE_HEIGHT)
)
const consoleHeight = computed(() => Math.min(maxConsoleHeight.value, preferredConsoleHeight.value))
const consoleResizeHandleEl = ref<HTMLDivElement>()
const isConsoleResizing = ref(false)

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
  if (consoleResizeHandleEl.value == null) return
  const signal = getCleanupSignal(onCleanup)
  let resizing = { initialClientY: 0, initialHeight: 0 }

  function handleMouseMove(event: MouseEvent) {
    setConsoleHeight(resizing.initialHeight - (event.clientY - resizing.initialClientY))
  }

  function endResizing() {
    isConsoleResizing.value = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', endResizing)
  }

  consoleResizeHandleEl.value.addEventListener(
    'mousedown',
    (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      isConsoleResizing.value = true
      resizing = {
        initialClientY: event.clientY,
        initialHeight: consoleHeight.value
      }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', endResizing)
    },
    { signal }
  )
  signal.addEventListener('abort', endResizing)
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
