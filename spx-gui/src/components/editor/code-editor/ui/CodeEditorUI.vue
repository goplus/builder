<script lang="ts">
export type CodeEditorUICtx = {
  ui: CodeEditorUI
}
const codeEditorUICtxInjectionKey: InjectionKey<CodeEditorUICtx> = Symbol('code-editor-ui-ctx')
export function useCodeEditorUICtx() {
  const ctx = inject(codeEditorUICtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorUICtx should be called inside of CodeEditorUI')
  return ctx
}
</script>

<script setup lang="ts">
import {
  type InjectionKey,
  inject,
  provide,
  ref,
  watchEffect,
  shallowRef,
  watch,
  computed,
  onDeactivated,
  onActivated
} from 'vue'
import { computedShallowReactive, untilNotNull, localStorageRef } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { theme, tabSize, insertSpaces } from '@/utils/spx/highlighter'
import { useI18n } from '@/utils/i18n'
import { getGopIdentifierNameTip, validateGopIdentifierName } from '@/utils/spx'
import { Sprite } from '@/models/sprite'
import {
  useRenameAnimation,
  useRenameBackdrop,
  useRenameCostume,
  useRenameSound,
  useRenameSprite,
  useRenameWidget
} from '@/components/asset'
import { Sound } from '@/models/sound'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import { Backdrop } from '@/models/backdrop'
import { isWidget } from '@/models/widget'
import { useModal } from '@/components/ui'
import RenameModal from '@/components/common/RenameModal.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useCodeEditorCtx, useRenameWarning } from '../context'
import {
  getResourceModel,
  getTextDocumentId,
  type Position,
  type Range,
  type ResourceIdentifier,
  type TextDocumentIdentifier
} from '../common'
import { type MonacoEditor, type monaco } from '../monaco'
import { CodeEditorUI } from './code-editor-ui'
import MonacoEditorComp from './MonacoEditor.vue'
import APIReferenceUI from './api-reference/APIReferenceUI.vue'
import HoverUI from './hover/HoverUI.vue'
import CompletionUI from './completion/CompletionUI.vue'
import CopilotUI from './copilot/CopilotUI.vue'
import CopilotTrigger from './copilot/CopilotTrigger.vue'
import DiagnosticsUI from './diagnostics/DiagnosticsUI.vue'
import ResourceReferenceUI from './resource-reference/ResourceReferenceUI.vue'
import ContextMenuUI from './context-menu/ContextMenuUI.vue'
import ClozeTestUI from './cloze-test/ClozeTestUI.vue'
import DocumentTabs from './document-tab/DocumentTabs.vue'
import ZoomControl from './ZoomControl.vue'
import { ClozeTestController } from './cloze-test'
const props = defineProps<{
  codeFilePath: string
}>()

const i18n = useI18n()
const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()
const invokeRenameModal = useModal(RenameModal)
const renameSprite = useRenameSprite()
const renameSound = useRenameSound()
const renameCostume = useRenameCostume()
const renameBackdrop = useRenameBackdrop()
const renameAnimation = useRenameAnimation()
const renameWidget = useRenameWidget()
const getRenameWarning = useRenameWarning()

async function rename(textDocumentId: TextDocumentIdentifier, position: Position, range: Range): Promise<void> {
  const textDocument = codeEditorCtx.getTextDocument(textDocumentId)
  if (textDocument == null) throw new Error(`Text document (${textDocumentId.uri}) not found`)
  const name = textDocument.getValueInRange(range)
  return invokeRenameModal({
    target: {
      name,
      validateName: validateGopIdentifierName,
      applyName: (newName) =>
        editorCtx.project.history.doAction({ name: { en: 'Rename', zh: '重命名' } }, () =>
          codeEditorCtx.rename(textDocumentId, position, newName)
        ),
      inputTip: getGopIdentifierNameTip(),
      warning: await getRenameWarning()
    }
  })
}

function renameResource(resourceId: ResourceIdentifier): Promise<void> {
  const model = getResourceModel(editorCtx.project, resourceId)
  if (model == null) throw new Error(`Resource (${resourceId.uri}) not found`)
  if (model instanceof Sprite) return renameSprite(model)
  if (model instanceof Sound) return renameSound(model)
  if (model instanceof Costume) return renameCostume(model)
  if (model instanceof Backdrop) return renameBackdrop(model)
  if (model instanceof Animation) return renameAnimation(model)
  if (isWidget(model)) return renameWidget(model)
  throw new Error(`Rename resource (${resourceId.uri}) not supported`)
}

const uiRef = computed(() => {
  const mainTextDocumentId = getTextDocumentId(props.codeFilePath)
  return new CodeEditorUI(
    mainTextDocumentId,
    editorCtx.project,
    i18n,
    codeEditorCtx.getMonaco(),
    codeEditorCtx.getTextDocument,
    rename,
    renameResource
  )
})

const clozeTestController = new ClozeTestController(uiRef.value)
clozeTestController.init()
watch(
  () => editorCtx.getClozeTestProvider(),
  () => {
    clozeTestController.registerProvider(editorCtx.getClozeTestProvider())
  },
  {
    immediate: true
  }
)

const initialFontSize = 12
const fontSize = localStorageRef('spx-gui-code-font-size', initialFontSize)

const monacoEditorOptions = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
  language: 'spx',
  theme,
  tabSize,
  insertSpaces,
  fontSize: fontSize.value,
  contextmenu: false
}))

const monacEditorRef = shallowRef<MonacoEditor | null>(null)

async function handleMonacoEditorInit(editor: MonacoEditor) {
  monacEditorRef.value = editor
}

watch(
  uiRef,
  async (ui, _, onCleanUp) => {
    const signal = getCleanupSignal(onCleanUp)
    signal.addEventListener('abort', () => ui.dispose())

    const editor = await untilNotNull(monacEditorRef)
    signal.throwIfAborted()
    ui.init(editor)

    ui.editor.onDidChangeConfiguration((e) => {
      const fontSizeId = ui.monaco.editor.EditorOption.fontSize
      if (e.hasChanged(fontSizeId)) {
        fontSize.value = ui.editor.getOptions().get(fontSizeId)
      }
    })

    codeEditorCtx.attachUI(ui)
    signal.addEventListener('abort', () => {
      codeEditorCtx.detachUI(ui)
    })
  },
  { immediate: true }
)

// We use `KeepAlive` (in `ProjectEditor`) to cache result of different editors (e.g. `SoundEditor`, `SpriteEditor`, `StageEditor`).
// So we need to attach/detach UI when `CodeEditorUI` is activated/deactivated
onActivated(() => codeEditorCtx.attachUI(uiRef.value))
onDeactivated(() => {
  uiRef.value.closeTempTextDocuments()
  codeEditorCtx.detachUI(uiRef.value)
})

function handleCopilotTriggerClick() {
  uiRef.value.setIsCopilotActive(true)
}

const codeEditorUICtx = computedShallowReactive<CodeEditorUICtx>(() => ({
  ui: uiRef.value
}))
provide(codeEditorUICtxInjectionKey, codeEditorUICtx)

// TOOD: use percentage instead of px as default width
const defaultSidebarWidth = 280 // px
const minSidebarWidth = 160 // px
const minMonacoEditorWidth = 200 // px
const codeEditorEl = ref<HTMLDivElement>()
const resizeHandleEl = ref<HTMLDivElement>()
const sidebarWidth = localStorageRef('spx-code-editor-sidebar-width', defaultSidebarWidth)
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
</script>

<template>
  <div ref="codeEditorEl" class="code-editor" :style="{ userSelect: isResizing ? 'none' : undefined }">
    <aside class="sidebar" :style="{ flexBasis: `${sidebarWidth}px` }">
      <APIReferenceUI class="api-reference" :controller="uiRef.apiReferenceController" />
      <footer class="footer">
        <TagNode name="copilot-trigger">
          <CopilotTrigger @click="handleCopilotTriggerClick" />
        </TagNode>
      </footer>
      <TagNode name="copilot-ui">
        <CopilotUI v-show="uiRef.isCopilotActive" class="copilot" :controller="uiRef.copilotController" />
      </TagNode>
    </aside>
    <div
      ref="resizeHandleEl"
      class="resize-handle"
      :class="{ active: isResizing }"
      :style="{ left: `${sidebarWidth}px` }"
    ></div>
    <MonacoEditorComp
      class="monaco-editor"
      :monaco="codeEditorCtx.getMonaco()"
      :options="monacoEditorOptions"
      @init="handleMonacoEditorInit"
    />
    <HoverUI :controller="uiRef.hoverController" />
    <CompletionUI :controller="uiRef.completionController" />
    <DiagnosticsUI :controller="uiRef.diagnosticsController" />
    <ResourceReferenceUI :controller="uiRef.resourceReferenceController" />
    <ContextMenuUI :controller="uiRef.contextMenuController" />
    <ClozeTestUI v-if="editorCtx.getClozeTestVisible()" :controller="clozeTestController" />
    <aside class="right-sidebar">
      <DocumentTabs class="document-tabs" />
      <ZoomControl class="zoom-control" @in="zoomIn" @out="zoomOut" @reset="zoomReset" />
    </aside>
  </div>
</template>

<style lang="scss" scoped>
.code-editor {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  justify-content: stretch;
}

.sidebar {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ui-color-dividing-line-2);

  .api-reference {
    flex: 1 1 0;
  }

  .footer {
    flex: 0 0 auto;
    padding: 12px 16px;
    display: flex;
    border-top: 1px solid var(--ui-color-dividing-line-2);
  }

  .copilot {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
  }
}

.resize-handle {
  position: absolute;
  width: 13px;
  height: 100%;
  margin-left: -7px;
  z-index: 10;
  cursor: col-resize;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(36, 41, 47, 0.05);
  }
  &.active {
    background-color: rgba(36, 41, 47, 0.1);
  }
}

.monaco-editor {
  flex: 1 1 0;
  min-width: 0;
  margin: 12px 0;
}

.right-sidebar {
  padding: 12px 8px;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;

  .document-tabs {
    flex: 0 1 auto;
    min-height: 0;
  }

  .zoom-control {
    flex: 0 0 auto;
  }
}
</style>
