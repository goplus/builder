<script lang="ts">
export type CodeEditorCtx = {
  ui: CodeEditorUI
}
const codeEditorCtxInjectionKey: InjectionKey<CodeEditorCtx> = Symbol('code-editor-ctx')
export function useCodeEditorCtx() {
  const ctx = inject(codeEditorCtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorCtx should be called inside of CodeEditorUI')
  return ctx
}

export function makeContentWidgetEl() {
  const el = document.createElement('div')
  el.className = 'code-editor-content-widget'
  return el
}
</script>

<script setup lang="ts">
import { type InjectionKey, inject, provide, ref, watchEffect } from 'vue'
import { shikiToMonaco } from '@shikijs/monaco'
import {
  computedShallowReactive,
  untilNotNull,
  useAsyncComputed,
  useComputedDisposable,
  useLocalStorage
} from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useI18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { getResourceModel, type ResourceIdentifier } from '../common'
import { type ICodeEditorUI, CodeEditorUI } from '.'
import MonacoEditorComp from './MonacoEditor.vue'
import APIReferenceUI from './api-reference/APIReferenceUI.vue'
import HoverUI from './hover/HoverUI.vue'
import CompletionUI from './completion/CompletionUI.vue'
import CopilotUI from './copilot/CopilotUI.vue'
import DiagnosticsUI from './diagnostics/DiagnosticsUI.vue'
import ResourceReferenceUI from './resource-reference/ResourceReferenceUI.vue'
import ContextMenuUI from './context-menu/ContextMenuUI.vue'
import { type Monaco, type MonacoEditor, type monaco } from './common'
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

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  init: [ui: ICodeEditorUI]
}>()

const i18n = useI18n()

const renameSprite = useRenameSprite()
const renameSound = useRenameSound()
const renameCostume = useRenameCostume()
const renameBackdrop = useRenameBackdrop()
const renameAnimation = useRenameAnimation()
const renameWidget = useRenameWidget()

function renameResource(resourceId: ResourceIdentifier) {
  const project = props.project
  const model = getResourceModel(project, resourceId)
  if (model == null) throw new Error(`Resource (${resourceId.uri}) not found`)
  if (model instanceof Sprite) return renameSprite({ project, sprite: model })
  if (model instanceof Sound) return renameSound({ project, sound: model })
  if (model instanceof Costume) return renameCostume({ project, costume: model })
  if (model instanceof Backdrop) return renameBackdrop({ project, backdrop: model })
  if (model instanceof Animation) return renameAnimation({ project, animation: model })
  if (isWidget(model)) return renameWidget({ project, widget: model })
  throw new Error(`Rename resource (${resourceId.uri}) not supported`)
}

const uiRef = useComputedDisposable(() => new CodeEditorUI(props.project, i18n, renameResource))

const monacoEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'spx',
  theme,
  tabSize,
  contextmenu: false
}
const highlighterComputed = useAsyncComputed(getHighlighter)

async function handleMonacoEditorInit(monaco: Monaco, editor: MonacoEditor, editorEl: HTMLElement) {
  monaco.languages.register({
    id: 'spx'
  })
  const highlighter = await untilNotNull(highlighterComputed)
  // TODO: this causes extra-padding issue when rendering selection
  shikiToMonaco(highlighter, monaco)

  // copied from https://github.com/goplus/vscode-gop/blob/dc065c1701ec54a719747ff41d2054e9ed200eb8/languages/gop.language-configuration.json
  monaco.languages.setLanguageConfiguration('spx', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      {
        open: '{',
        close: '}'
      },
      {
        open: '[',
        close: ']'
      },
      {
        open: '(',
        close: ')'
      },
      {
        open: '`',
        close: '`',
        notIn: ['string']
      },
      {
        open: '"',
        close: '"',
        notIn: ['string']
      },
      {
        open: "'",
        close: "'",
        notIn: ['string', 'comment']
      }
    ],
    surroundingPairs: [
      {
        open: '{',
        close: '}'
      },
      {
        open: '[',
        close: ']'
      },
      {
        open: '(',
        close: ')'
      },
      {
        open: '"',
        close: '"'
      },
      {
        open: "'",
        close: "'"
      },
      {
        open: '`',
        close: '`'
      }
    ],
    indentationRules: {
      increaseIndentPattern: new RegExp(
        '^.*(\\bcase\\b.*:|\\bdefault\\b:|(\\b(func|if|else|switch|select|for|struct)\\b.*)?{[^}"\'`]*|\\([^)"\'`]*)$'
      ),
      decreaseIndentPattern: new RegExp('^\\s*(\\bcase\\b.*:|\\bdefault\\b:|}[)}]*[),]?|\\)[,]?)$')
    },
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b')
      }
    }
  })

  uiRef.value.init(monaco, editor, editorEl)
  emit('init', uiRef.value)
}

function handleCopilotTriggerClick() {
  uiRef.value.setIsCopilotActive(true)
}

const codeEditorCtx = computedShallowReactive<CodeEditorCtx>(() => ({
  ui: uiRef.value
}))
provide(codeEditorCtxInjectionKey, codeEditorCtx)

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
    <MonacoEditorComp class="monaco-editor" :options="monacoEditorOptions" @init="handleMonacoEditorInit" />
    <HoverUI :controller="uiRef.hoverController" />
    <CompletionUI :controller="uiRef.completionController" />
    <DiagnosticsUI :controller="uiRef.diagnosticsController" />
    <ResourceReferenceUI :controller="uiRef.resourceReferenceController" />
    <ContextMenuUI :controller="uiRef.contextMenuController" />
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
}

:global(.code-editor-content-widget) {
  z-index: 10; // Ensure content widget is above other elements, especially cursor
  padding: 2px 0; // Gap between content widget and text
}
</style>
