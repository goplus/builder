<script lang="ts">
export type CodeEditorUICtx = {
  ui: CodeEditorUIController
  /**
   * Whether the editor is in the simplified block style (tutorial focused mode): API reference
   * items render as draggable blocks, and the in-place value-editing helper (the pencil) is off.
   */
  blockStyle: boolean
}
const codeEditorUICtxInjectionKey: InjectionKey<CodeEditorUICtx> = Symbol('code-editor-ui-ctx')
export function useCodeEditorUICtx() {
  const ctx = inject(codeEditorUICtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorUICtx should be called inside of CodeEditorUI')
  return ctx
}
</script>

<script setup lang="ts">
import { throttle } from 'lodash'
import { type InjectionKey, inject, provide, ref, watchEffect, shallowRef, watch, computed } from 'vue'
import { computedShallowReactive, untilNotNull, untilTaskScheduled } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { useI18n } from '@/utils/i18n'
import { getXGoIdentifierNameTip, validateXGoIdentifierName } from '@/utils/xgo'
import { theme, tabSize, insertSpaces } from '@/utils/xgo/highlighter'
import { providePopupContainer, useModal } from '@/components/ui'
import RenameModal from '@/components/common/RenameModal.vue'
import { useCodeEditor } from '../context'
import { getDdiDragData, getTextDocumentId, type Position, type Range, type TextDocumentIdentifier } from '../common'
import { type MonacoEditor, type monaco } from '../monaco'
import { fromMonacoPosition } from './common'
import { CodeEditorUIController } from './code-editor-ui'
import MonacoEditorComp from './MonacoEditor.vue'
import APIReferenceUI from './api-reference/APIReferenceUI.vue'
import HoverUI from './hover/HoverUI.vue'
import CompletionUI from './completion/CompletionUI.vue'
import DiagnosticsUI from './diagnostics/DiagnosticsUI.vue'
import ContextMenuUI from './context-menu/ContextMenuUI.vue'
import InputHelperUI from './input-helper/InputHelperUI.vue'
import InlayHintUI from './inlay-hint/InlayHintUI.vue'
import DropIndicatorUI from './drop-indicator/DropIndicatorUI.vue'
import CodeGuideUI from './code-guide/CodeGuideUI.vue'
import DocumentTabs from './document-tab/DocumentTabs.vue'
import ZoomControl from './ZoomControl.vue'
import { userLocalStorageRef } from '@/utils/user-storage'

const props = withDefaults(
  defineProps<{
    codeFilePath: string
    /**
     * Fixed font size (px) for code. When set, it overrides the user-adjustable (zoomable,
     * persisted) font size and the zoom control is hidden.
     */
    fontSize?: number | null
    /** Whether to show the tools (document tabs & zoom control) beside the code editor. */
    toolsVisible?: boolean
    /** Render the API reference items as draggable blocks, see `APIReferenceUI`. */
    apiReferenceBlockStyle?: boolean
  }>(),
  {
    fontSize: null,
    toolsVisible: true,
    apiReferenceBlockStyle: false
  }
)

const i18n = useI18n()
const codeEditor = useCodeEditor()
const invokeRenameModal = useModal(RenameModal)

async function rename(textDocumentId: TextDocumentIdentifier, position: Position, range: Range): Promise<void> {
  const textDocument = codeEditor.getTextDocument(textDocumentId)
  if (textDocument == null) throw new Error(`Text document (${textDocumentId.uri}) not found`)
  const name = textDocument.getValueInRange(range)
  await invokeRenameModal({
    target: {
      name,
      validateName: validateXGoIdentifierName,
      applyName: (newName: string) =>
        codeEditor.history.doAction({ name: { en: 'Rename', zh: '重命名' } }, () =>
          codeEditor.rename(textDocumentId, position, newName)
        ),
      inputTip: getXGoIdentifierNameTip(),
      warning: await codeEditor.getRenameWarning()
    }
  })
}

const uiRef = computed(() => {
  const mainTextDocumentId = getTextDocumentId(props.codeFilePath)
  return new CodeEditorUIController(mainTextDocumentId, codeEditor, i18n, rename)
})

const initialFontSize = 12
const userFontSize = userLocalStorageRef('spx-gui-code-font-size', initialFontSize)

const monacoEditorOptions = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
  language: 'xgo',
  theme,
  tabSize,
  insertSpaces,
  fontSize: props.fontSize ?? userFontSize.value,
  contextmenu: false
}))

const monacoEditorRef = shallowRef<MonacoEditor | null>(null)

async function handleMonacoEditorInit(editor: MonacoEditor) {
  monacoEditorRef.value = editor
}

// Monaco applies construction options only on creation, so the font-size override needs to be
// (re)applied when it changes while the editor is already mounted.
watch(
  () => [monacoEditorRef.value, props.fontSize] as const,
  ([editor, fontSizeOverride]) => {
    if (editor == null) return
    editor.updateOptions({ fontSize: fontSizeOverride ?? userFontSize.value })
  }
)

const handleMonacoEditorDrag = throttle((clientPoint: { x: number; y: number } | null) => {
  const ui = uiRef.value
  if (clientPoint == null) {
    ui.dropIndicatorController.setDropPosition(null)
    return
  }
  const target = ui.editor.getTargetAtClientPoint(clientPoint.x, clientPoint.y)
  if (target == null || target.position == null) {
    ui.dropIndicatorController.setDropPosition(null)
    return
  }
  const position = fromMonacoPosition(target.position)
  ui.dropIndicatorController.setDropPosition(position)
}, 50)

function handleMonacoEditorDragOver(e: DragEvent) {
  e.preventDefault()
  handleMonacoEditorDrag({
    x: e.clientX,
    y: e.clientY
  })
}

function handleMonacoEditorDragLeave(e: DragEvent) {
  e.preventDefault()
  handleMonacoEditorDrag(null)
}

async function handleMonacoEditorDrop(e: DragEvent) {
  e.preventDefault()

  const ui = uiRef.value
  ui.dropIndicatorController.setDropPosition(null)
  handleMonacoEditorDrag.cancel()
  if (e.dataTransfer == null) return

  const target = ui.editor.getTargetAtClientPoint(e.clientX, e.clientY)
  if (target == null || target.position == null) return
  const position = fromMonacoPosition(target.position)
  // When dropping onto a blank but indented line (e.g. the line opened for a drag hint), land after the
  // existing indentation so the inserted code keeps that indent instead of jumping to the line start.
  const targetLineContent = ui.activeTextDocument?.getLineContent(position.line) ?? ''
  if (targetLineContent !== '' && targetLineContent.trim() === '') {
    position.column = targetLineContent.length + 1
  }
  const range = { start: position, end: position }
  const ddi = getDdiDragData(e.dataTransfer)
  if (ddi != null) {
    await codeEditor.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      ui.insertDefinition(ddi, range)
    )
    return
  }
  const dataTextPlain = e.dataTransfer.getData('text/plain')
  if (dataTextPlain !== '') {
    await codeEditor.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      ui.insertText(dataTextPlain, range)
    )
    return
  }
}

watch(
  uiRef,
  async (ui, _, onCleanUp) => {
    const signal = getCleanupSignal(onCleanUp)
    signal.addEventListener('abort', () => ui.dispose())

    const editor = await untilNotNull(monacoEditorRef)
    signal.throwIfAborted()

    await untilTaskScheduled('user-visible', signal)
    ui.init(editor)

    ui.editor.onDidChangeConfiguration((e) => {
      if (props.fontSize != null) return // Do not persist changes driven by the fixed override
      const fontSizeId = ui.monaco.editor.EditorOption.fontSize
      if (e.hasChanged(fontSizeId)) {
        userFontSize.value = ui.editor.getOptions().get(fontSizeId)
      }
    })

    codeEditor.attachUI(ui)
    signal.addEventListener('abort', () => {
      codeEditor.detachUI(ui)
    })
  },
  { immediate: true }
)

const codeEditorUICtx = computedShallowReactive<CodeEditorUICtx>(() => ({
  ui: uiRef.value,
  blockStyle: props.apiReferenceBlockStyle
}))
provide(codeEditorUICtxInjectionKey, codeEditorUICtx)

// TOOD: use percentage instead of px as default width
const defaultSidebarWidth = 280 // px
const minSidebarWidth = 160 // px
const minMonacoEditorWidth = 200 // px
const codeEditorEl = ref<HTMLDivElement>()
const resizeHandleEl = ref<HTMLDivElement>()
const sidebarWidth = userLocalStorageRef('spx-code-editor-sidebar-width', defaultSidebarWidth)
const isResizing = ref(false)

watchEffect((onCleanup) => {
  if (resizeHandleEl.value == null) return
  const signal = getCleanupSignal(onCleanup)
  let resizing = {
    initialClientX: 0,
    initialWidth: 0,
    maxWidth: 0
  }
  function handleMouseMove(e: MouseEvent) {
    const offset = e.clientX - resizing.initialClientX
    sidebarWidth.value = Math.min(Math.max(minSidebarWidth, resizing.initialWidth + offset), resizing.maxWidth)
  }
  function endResizing() {
    isResizing.value = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', endResizing)
  }
  resizeHandleEl.value.addEventListener(
    'mousedown',
    (e) => {
      isResizing.value = true
      resizing = {
        initialClientX: e.clientX,
        initialWidth: sidebarWidth.value,
        maxWidth: codeEditorEl.value!.clientWidth - minMonacoEditorWidth
      }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', endResizing)
    },
    { signal }
  )
  signal.addEventListener('abort', endResizing)
})

function zoomIn() {
  uiRef.value.editor.trigger('keyboard', `editor.action.fontZoomIn`, {})
}

function zoomOut() {
  uiRef.value.editor.trigger('keyboard', `editor.action.fontZoomOut`, {})
}

function zoomReset() {
  uiRef.value.editor.updateOptions({ fontSize: initialFontSize })
  uiRef.value.editor.trigger('keyboard', `editor.action.fontZoomReset`, {})
}

// This ensures popovers (like tooltips or dropdowns) are children of the code editor element.
// When the code editor is hidden (e.g., switching tabs), the popovers are hidden with it.
// Fixes: https://github.com/goplus/builder/issues/2521
providePopupContainer(codeEditorEl)
</script>

<template>
  <div
    ref="codeEditorEl"
    class="relative flex min-h-0 flex-[1_1_0] justify-stretch"
    :style="{ userSelect: isResizing ? 'none' : undefined }"
  >
    <aside
      class="relative flex min-h-0 min-w-0 flex-col border-r border-r-dividing-line-2"
      :class="apiReferenceBlockStyle ? 'flex-[1_1_0]' : 'flex-none'"
      :style="apiReferenceBlockStyle ? undefined : { flexBasis: `${sidebarWidth}px` }"
    >
      <APIReferenceUI
        class="flex-[1_1_0]"
        :controller="uiRef.apiReferenceController"
        :block-style="apiReferenceBlockStyle"
      />
    </aside>
    <div
      v-if="!apiReferenceBlockStyle"
      ref="resizeHandleEl"
      v-radar="{ name: 'Resize handle', desc: 'Drag to resize the sidebar' }"
      class="absolute z-10 -ml-1.75 h-full w-3.25 cursor-col-resize transition-colors hover:bg-black/5"
      :class="{ 'bg-black/10': isResizing }"
      :style="{ left: `${sidebarWidth}px` }"
    ></div>
    <MonacoEditorComp
      v-radar="{ name: 'Code text editor', desc: 'Text editor for code' }"
      class="my-3 min-w-0"
      :class="apiReferenceBlockStyle ? 'flex-[2.5_1_0]' : 'flex-[1_1_0]'"
      :monaco="codeEditor.monaco"
      :options="monacoEditorOptions"
      @init="handleMonacoEditorInit"
      @dragover="handleMonacoEditorDragOver"
      @dragleave="handleMonacoEditorDragLeave"
      @drop="handleMonacoEditorDrop"
    />
    <HoverUI :controller="uiRef.hoverController" />
    <CompletionUI :controller="uiRef.completionController" />
    <DiagnosticsUI :controller="uiRef.diagnosticsController" />
    <ContextMenuUI :controller="uiRef.contextMenuController" />
    <InputHelperUI :controller="uiRef.inputHelperController" />
    <InlayHintUI :controller="uiRef.inlayHintController" />
    <DropIndicatorUI :controller="uiRef.dropIndicatorController" />
    <CodeGuideUI :controller="uiRef.codeGuideController" />
    <aside v-if="toolsVisible" class="flex min-h-0 min-w-0 flex-none flex-col justify-between gap-10 px-2 py-3">
      <DocumentTabs class="min-h-0 flex-[0_1_auto]" />
      <ZoomControl v-if="props.fontSize == null" class="flex-none" @in="zoomIn" @out="zoomOut" @reset="zoomReset" />
    </aside>
  </div>
</template>
