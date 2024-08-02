<template>
  <div class="code-text-editor-container">
    <div
      ref="editorElement"
      class="code-text-editor"
      :style="{
        '--monaco-editor-font-size': completionMenuState.fontSize + 'px',
        '--monaco-editor-line-height': completionMenuState.lineHeight + 'px'
      }"
    ></div>
    <completion-menu
      v-show="completionMenuState.visible"
      ref="completionMenuRef"
      :suggestions="completionMenuState.suggestions"
      :active-idx="completionMenuState.activeIdx"
      :line-height="completionMenuState.lineHeight"
      :font-size="completionMenuState.fontSize"
      :style="{
        top: completionMenuState.position.top + 'px',
        left: completionMenuState.position.left + 'px'
      }"
      @select="(_, idx) => fnSelectMonacoCompletionMenu?.(idx)"
    ></completion-menu>
  </div>
</template>
<script lang="ts">
let monaco: typeof import('monaco-editor')
let editorCtx: EditorCtx // define `editorCtx` here so `getProject` in `initMonaco` can get the right `editorCtx.project`
</script>
<script setup lang="ts">
import { reactive, ref, shallowRef, watch, watchEffect } from 'vue'
import { formatSpxCode as onlineFormatSpxCode } from '@/apis/util'
import loader from '@monaco-editor/loader'
import { KeyCode, type editor, Position, MarkerSeverity, KeyMod } from 'monaco-editor'
import { useUIVariables } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useEditorCtx, type EditorCtx } from '../../EditorContextProvider.vue'
import { initMonaco, defaultThemeName, disposeMonacoProviders } from './monaco'
import { useLocalStorage } from '@/utils/utils'
import CompletionMenu from '@/components/editor/code-editor/code-text-editor/CompletionMenu.vue'
import {
  CompletionMenuProvider,
  type CompletionMenuState
} from './providers/CompletionMenuProvider'
const props = defineProps<{
  value: string
}>()
const emit = defineEmits<{
  'update:value': [string]
}>()

const editorElement = ref<HTMLDivElement>()

const monacoEditor = shallowRef<editor.IStandaloneCodeEditor>()
const fnSelectMonacoCompletionMenu = shallowRef<((idx: number) => void) | null>()
const completionMenuRef = ref<{
  $container: HTMLElement
}>()
const completionMenuState = reactive<CompletionMenuState>({
  visible: false,
  suggestions: [],
  activeIdx: 0,
  position: {
    top: 0,
    left: 0
  },
  lineHeight: 19,
  fontSize: 14,
  word: ''
})
const uiVariables = useUIVariables()
const i18n = useI18n()
editorCtx = useEditorCtx()

if (i18n.lang.value !== 'en') {
  const langOverride = {
    zh: 'zh-cn'
  }
  const locale = langOverride[i18n.lang.value] || i18n.lang.value
  loader.config({
    'vs/nls': {
      availableLanguages: {
        '*': locale
      }
    }
  })
}

const getMonaco = async () => {
  if (monaco) return monaco
  const monaco_ = await loader.init()
  if (monaco) return monaco
  initMonaco(monaco_, uiVariables, i18n, () => editorCtx.project)
  monaco = monaco_
  return monaco
}

// the line height is rounded to fontSize * 1.35
const initialFontSize = 20
const fontSize = useLocalStorage('spx-gui-code-font-size', initialFontSize)

watchEffect(async (onCleanup) => {
  const monaco = await getMonaco()
  const editor = monaco.editor.create(editorElement.value!, {
    value: props.value,
    theme: defaultThemeName,
    language: 'spx',
    minimap: { enabled: false },
    selectOnLineNumbers: true,
    roundedSelection: true,
    readOnly: false,
    cursorStyle: 'line', // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true,
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false,
    fontSize: fontSize.value,
    quickSuggestionsDelay: 100,
    wordWrapColumn: 40,
    tabSize: 4,
    folding: true, // code folding
    foldingHighlight: true, // 折叠等高线
    foldingStrategy: 'indentation', // 折叠方式  auto | indentation
    showFoldingControls: 'mouseover', // 是否一直显示折叠 always | mouseover
    disableLayerHinting: true, // 等宽优
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    overviewRulerLanes: 0,
    renderLineHighlight: 'none',
    scrollbar: {
      useShadows: false,
      horizontalScrollbarSize: 8,
      verticalScrollbarSize: 8
    }
  })

  function updateCompletionMenuPosition() {
    const position = editor.getPosition()
    if (!position) return
    if (!completionMenuRef.value) return
    const $completionMenu = completionMenuRef.value.$container
    if (!$completionMenu) return
    const pixelPosition = editor.getScrolledVisiblePosition(position)
    if (!pixelPosition) return
    const fontSize = editor.getRawOptions().fontSize || initialFontSize
    const isMultiline = () => {
      const { suggestions, activeIdx } = completionMenuState
      if (activeIdx < 0 || activeIdx >= suggestions.length) return false
      const activeSuggestion = suggestions[activeIdx]
      if (!activeSuggestion.insertText) return false
      const lines = activeSuggestion.insertText.split('\n')
      if (!lines.shift()?.toLocaleLowerCase().startsWith(completionMenuState.word.toLowerCase()))
        return false
      return lines.length > 0
    }

    const cursorY = pixelPosition.top
    const windowHeight = window.innerHeight
    const completionMenuHeight = $completionMenu.offsetHeight
    completionMenuState.fontSize = fontSize
    completionMenuState.position.left = pixelPosition.left
    completionMenuState.lineHeight = pixelPosition.height
    completionMenuState.position.top = cursorY + pixelPosition.height
    if (windowHeight - cursorY > completionMenuHeight && !isMultiline()) {
      $completionMenu.classList.remove('completion-menu--reverse-up')
    } else {
      $completionMenu.classList.add('completion-menu--reverse-up')
    }
  }

  const completionMenuProvider = new CompletionMenuProvider(editor, completionMenuState)

  completionMenuProvider.addEventListener('onShow', () => {
    // must be use next render time to update correct position
    setTimeout(() => updateCompletionMenuPosition(), 0)
  })

  completionMenuProvider.addEventListener('onFocus', () => {
    updateCompletionMenuPosition()
  })

  // todo: consider will this code has potential memory leak?
  fnSelectMonacoCompletionMenu.value = (idx: number) => {
    // this can avoid class inner function `this` be changed by others
    completionMenuProvider.select(idx)
  }

  editor.addAction({
    id: 'format',
    label: i18n.t({ zh: '格式化', en: 'Format Code' }),
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyL],
    contextMenuGroupId: 'navigation',
    run: format
  })

  editor.onDidChangeModelContent(() => {
    const newValue = editor.getValue()
    if (newValue !== props.value) emit('update:value', newValue)
  })

  editor.onDidChangeConfiguration((e) => {
    const fontSizeId = monaco.editor.EditorOption.fontSize
    if (e.hasChanged(fontSizeId)) {
      fontSize.value = editor.getOptions().get(fontSizeId)
    }
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
    // We provide global undo/redo in project editor, without keyboard shortcut support.
    // So we disable default undo behavior (Cmd/Ctrl+Z) of monaco, which may cause confusing behavior if used together with global undo/redo.
    // Note that it is not appropriate to call global undo here, because global undo/redo merges code changes, it is not expected for Cmd+Z.
  })

  monacoEditor.value = editor
  onCleanup(() => {
    completionMenuProvider.dispose()
    disposeMonacoProviders()
    fnSelectMonacoCompletionMenu.value = null
    editor.dispose()
  })
})

watch(
  () => props.value,
  (val) => {
    if (monaco && monacoEditor.value) {
      const editorValue = monacoEditor.value.getValue()
      if (val !== editorValue) {
        monacoEditor.value.setValue(val)
      }
    }
  }
)

function insertSnippet(insertText: string, position?: Position) {
  const editor = monacoEditor.value
  if (editor == null) return

  if (position) {
    editor.setPosition(position)
  }
  let contribution = editor.getContribution('snippetController2')
  ;(contribution as any).insert(insertText) // FIXME: get rid of `as any`
  editor.focus()
}

async function format() {
  const editor = monacoEditor.value
  if (editor == null) return

  const editorValue = editor.getValue()
  if (!editorValue) return

  const res = await onlineFormatSpxCode(editorValue)
  if (res.error) {
    monaco?.editor.setModelMarkers(editor.getModel()!, 'owner', [
      {
        message: res.error.msg,
        severity: MarkerSeverity.Warning,
        startLineNumber: res.error.line,
        startColumn: res.error.column,
        endLineNumber: res.error.line,
        endColumn: res.error.column
      }
    ])
    return
  }
  editor.setValue(res.body)
}

const actionIds = {
  in: 'fontZoomIn',
  out: 'fontZoomOut'
}

function zoomFont(action: 'in' | 'out' | 'initial') {
  const editor = monacoEditor.value
  if (editor == null) return
  if (action === 'initial') {
    editor.updateOptions({ fontSize: initialFontSize })
    editor.trigger('keyboard', `editor.action.fontZoomReset`, {})
    return
  }
  editor.trigger('keyboard', `editor.action.${actionIds[action]}`, {})
}

defineExpose({
  insertSnippet,
  format,
  zoomFont
})
</script>

<style scoped lang="scss">
.code-text-editor,
.code-text-editor-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>

<style lang="scss">
.code-text-editor .monaco-editor .monaco-hover {
  // keep consistent with component `UITooltip`
  width: auto !important;
  height: auto !important;
  border: none;
  border-radius: var(--ui-border-radius-1);
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-grey-1000);
  box-shadow: var(--ui-box-shadow-small);

  .monaco-hover-content {
    height: auto !important;
  }

  .hover-contents:not(.html-hover-contents) {
    padding: 7px 8px;
    font-size: 12px;
    line-height: 1.5;
  }

  .rendered-markdown {
    ul {
      list-style: square;
    }
    ol {
      list-style: decimal;
    }
    code {
      // keep consistent with component `UICode`
      padding: 2px 4px;
      font-size: 10px;
      font-family: var(--ui-font-family-code);
      line-height: 1.6;
      color: var(--ui-color-primary-main);
      background-color: var(--ui-color-primary-200);
      border-radius: 4px;
    }
  }
}
</style>
