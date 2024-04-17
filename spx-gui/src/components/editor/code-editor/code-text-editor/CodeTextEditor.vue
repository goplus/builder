<template>
  <div ref="editorElement" class="code-text-editor"></div>
</template>

<script setup lang="ts">
import { onUnmounted, onMounted, ref, shallowRef, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { formatSpxCode as onlineFormatSpxCode } from '@/apis/util'
import { useMonacoInitialization, defaultThemeName } from './initialization'

const props = defineProps<{
  value: string
}>()
const emit = defineEmits<{
  'update:value': [string]
}>()

const editorElement = ref<HTMLElement | null>(null)
const monacoEditor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null)

useMonacoInitialization()

onMounted(() => {
  const editor = monaco.editor.create(editorElement.value!, {
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
    scrollbar: {
      useShadows: false
    }
  })

  editor.addAction({
    id: 'format',
    label: 'Format Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
    contextMenuGroupId: 'navigation',
    run: format
  })

  editor.onDidChangeModelContent(() => {
    emit('update:value', editor.getValue())
  })

  monacoEditor.value = editor
})

onUnmounted(() => {
  monacoEditor.value?.dispose()
})

watch(
  () => props.value,
  (val) => {
    if (monacoEditor.value) {
      const editorValue = monacoEditor.value.getValue()
      if (val !== editorValue) {
        monacoEditor.value.setValue(val)
      }
    }
  }
)

function insertSnippet(snippet: monaco.languages.CompletionItem, position?: monaco.Position) {
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
    monaco.editor.setModelMarkers(editor.getModel()!, 'owner', [
      {
        message: res.Error.Msg,
        severity: monaco.MarkerSeverity.Warning,
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
