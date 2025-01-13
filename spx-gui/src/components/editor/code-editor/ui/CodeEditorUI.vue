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
import { type InjectionKey, inject, provide, ref, watchEffect, shallowRef, watch, computed, onDeactivated, onActivated } from 'vue'
import { computedShallowReactive, untilNotNull, useLocalStorage } from '@/utils/utils'
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
import DiagnosticsUI from './diagnostics/DiagnosticsUI.vue'
import ResourceReferenceUI from './resource-reference/ResourceReferenceUI.vue'
import ContextMenuUI from './context-menu/ContextMenuUI.vue'
import DocumentTabs from './document-tab/DocumentTabs.vue'
import ZoomControl from './ZoomControl.vue'

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

const initialFontSize = 12
const fontSize = useLocalStorage('spx-gui-code-font-size', initialFontSize)

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
const sidebarWidth = useLocalStorage('spx-code-editor-sidebar-width', defaultSidebarWidth)
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
        <div class="copilot-trigger" @click="handleCopilotTriggerClick">
          <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" width="24" height="24" rx="7.5" fill="#181B1F" />
            <path
              d="M14.9583 5.52564C14.8655 5.28427 14.6336 5.125 14.375 5.125C14.1164 5.125 13.8845 5.28427 13.7917 5.52564L13.055 7.4409C12.8673 7.92905 12.8083 8.06972 12.7276 8.18322C12.6466 8.2971 12.5471 8.39659 12.4332 8.47757C12.3197 8.55827 12.1791 8.61727 11.6909 8.80502L9.77564 9.54166C9.53427 9.63449 9.375 9.86639 9.375 10.125C9.375 10.3836 9.53427 10.6155 9.77564 10.7083L11.6909 11.445C12.1791 11.6327 12.3197 11.6917 12.4332 11.7724C12.5471 11.8534 12.6466 11.9529 12.7276 12.0668C12.8083 12.1803 12.8673 12.3209 13.055 12.8091L13.7917 14.7244C13.8845 14.9657 14.1164 15.125 14.375 15.125C14.6336 15.125 14.8655 14.9657 14.9583 14.7244L15.695 12.8091C15.8827 12.3209 15.9417 12.1803 16.0224 12.0668C16.1034 11.9529 16.2029 11.8534 16.3168 11.7724C16.4303 11.6917 16.5709 11.6327 17.0591 11.445L18.9744 10.7083C19.2157 10.6155 19.375 10.3836 19.375 10.125C19.375 9.86639 19.2157 9.63449 18.9744 9.54166L17.0591 8.80502C16.5709 8.61727 16.4303 8.55827 16.3168 8.47757C16.2029 8.39659 16.1034 8.2971 16.0224 8.18322C15.9417 8.06972 15.8827 7.92905 15.695 7.4409L14.9583 5.52564Z"
              fill="#FCFDFE"
            />
            <path
              d="M9.62152 12.3455C9.51565 12.1338 9.29923 12 9.0625 12C8.82577 12 8.60935 12.1338 8.50348 12.3455L8.0132 13.3261C7.83664 13.6792 7.78284 13.7808 7.71747 13.8656C7.65191 13.9506 7.57565 14.0269 7.49059 14.0925C7.40578 14.1578 7.30417 14.2116 6.95106 14.3882L5.97049 14.8785C5.75875 14.9844 5.625 15.2008 5.625 15.4375C5.625 15.6742 5.75875 15.8906 5.97049 15.9965L6.95106 16.4868C7.30417 16.6634 7.40578 16.7172 7.49059 16.7825C7.57565 16.8481 7.65191 16.9243 7.71747 17.0094C7.78284 17.0942 7.83664 17.1958 8.0132 17.5489L8.50348 18.5295C8.60935 18.7412 8.82577 18.875 9.0625 18.875C9.29923 18.875 9.51565 18.7412 9.62152 18.5295L10.1118 17.5489C10.2884 17.1958 10.3422 17.0942 10.4075 17.0094C10.4731 16.9243 10.5494 16.8481 10.6344 16.7825C10.7192 16.7172 10.8208 16.6634 11.1739 16.4868L12.1545 15.9965C12.3662 15.8906 12.5 15.6742 12.5 15.4375C12.5 15.2008 12.3662 14.9844 12.1545 14.8785L11.1739 14.3882C10.8208 14.2116 10.7192 14.1578 10.6344 14.0925C10.5494 14.0269 10.4731 13.9506 10.4075 13.8656C10.3422 13.7808 10.2884 13.6792 10.1118 13.3261L9.62152 12.3455Z"
              fill="#FCFDFE"
            />
          </svg>
          {{
            $t({
              en: 'Ask copilot',
              zh: '向 Copilot 提问'
            })
          }}
        </div>
      </footer>
      <CopilotUI v-show="uiRef.isCopilotActive" class="copilot" :controller="uiRef.copilotController" />
    </aside>
    <div ref="resizeHandleEl" class="resize-handle" :style="{ left: `${sidebarWidth}px` }"></div>
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

    .copilot-trigger {
      flex: 1 1 0;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-radius: var(--ui-border-radius-1);
      background-color: var(--ui-color-grey-300);
      cursor: pointer;
      transition: 0.2s;

      &:hover {
        // TODO: confirm hover style
        color: var(--ui-color-title);
        background-color: var(--ui-color-grey-400);
      }
    }
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
  width: 16px;
  height: 100%;
  margin-left: -8px;
  z-index: 10;
  cursor: col-resize;
  transition: background-color 0.2s;

  // TODO: confirm style details
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  &.active {
    background-color: rgba(0, 0, 0, 0.1);
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
