<template>
  <div ref="editorElement" class="code-text-editor"></div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, watchEffect } from 'vue'
import { formatSpxCode as onlineFormatSpxCode } from '@/apis/util'
import { initMonaco, defaultThemeName } from './initialization'
import loader from '@monaco-editor/loader'
import { KeyCode, languages, type editor, Position, MarkerSeverity, KeyMod } from 'monaco-editor'
import { useUIVariables } from '@/components/ui'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  value: string
}>()
const emit = defineEmits<{
  'update:value': [string]
}>()

const editorElement = ref<HTMLElement | null>(null)

const monaco = shallowRef<typeof import('monaco-editor')>()
const monacoEditor = shallowRef<editor.IStandaloneCodeEditor>()

const uiVariables = useUIVariables()
const { t, lang } = useI18n()

if (lang.value !== 'en') {
  const langOverride = {
    zh: 'zh-cn'
  }
  const locale = langOverride[lang.value] || lang.value
  loader.config({
    'vs/nls': {
      availableLanguages: {
        '*': locale
      }
    }
  })
}

watchEffect(async (onClenaup) => {
  const monaco_ = await loader.init()
  initMonaco(monaco_, uiVariables)
  const editor = monaco_.editor.create(editorElement.value!, {
    value: props.value, // set the initial value of the editor
    theme: defaultThemeName,
    language: 'spx', // define the language mode
    minimap: { enabled: false },
    selectOnLineNumbers: true, // select the line number's of the code
    roundedSelection: true, // rounded selection
    readOnly: false, // read/write
    cursorStyle: 'line', // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true, // auto layout
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false, // render control characters
    fontSize: 14, // font size
    quickSuggestionsDelay: 100, // quick suggestions
    wordWrapColumn: 40,
    tabSize: 4, // tab size
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

  editor.addAction({
    id: 'format',
    label: t({ zh: '格式化', en: 'Format Code' }),
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyL],
    contextMenuGroupId: 'navigation',
    run: format
  })

  editor.onDidChangeModelContent(() => {
    emit('update:value', editor.getValue())
  })

  monaco.value = monaco_
  monacoEditor.value = editor

  onClenaup(() => {
    editor.dispose()
  })
})

watch(
  () => props.value,
  (val) => {
    if (monaco.value && monacoEditor.value) {
      const editorValue = monacoEditor.value.getValue()
      if (val !== editorValue) {
        monacoEditor.value.setValue(val)
      }
    }
  }
)

function insertSnippet(snippet: languages.CompletionItem, position?: Position) {
  const editor = monacoEditor.value
  if (editor == null) return

  if (position) {
    editor.setPosition(position)
  }
  let contribution = editor.getContribution('snippetController2')
  ;(contribution as any).insert(snippet.insertText) // FIXME: get rid of `as any`
  editor.focus()
}

async function format() {
  const editor = monacoEditor.value
  if (editor == null) return

  const res = await onlineFormatSpxCode(editor.getValue())
  if (res.Body) {
    editor.setValue(res.Body)
  } else {
    monaco.value?.editor.setModelMarkers(editor.getModel()!, 'owner', [
      {
        message: res.Error.Msg,
        severity: MarkerSeverity.Warning,
        startLineNumber: res.Error.Line,
        startColumn: res.Error.Column,
        endLineNumber: res.Error.Column,
        endColumn: res.Error.Line
      }
    ])
  }
}

defineExpose({
  insertSnippet,
  format
})
</script>

<style scoped>
.code-text-editor {
  width: 100%;
  height: 100%;
}
</style>
