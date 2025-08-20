<script lang="ts">
import { debounce } from 'lodash'
import { untilNotNull } from '@/utils/utils'
import { type Monaco, type MonacoEditor, type monaco as tmonaco } from '../monaco'
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  monaco: Monaco
  options: tmonaco.editor.IStandaloneEditorConstructionOptions
}>()

const emit = defineEmits<{
  init: [MonacoEditor]
}>()

const editorElRef = ref<HTMLDivElement>()

watchEffect(async (onClenaup) => {
  const monaco = props.monaco
  const editorEl = await untilNotNull(editorElRef)

  const editor = monaco.editor.create(editorEl, {
    minimap: { enabled: false },
    selectOnLineNumbers: true,
    roundedSelection: true,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    glyphMargin: true,
    useTabStops: false,
    renderControlCharacters: false,
    quickSuggestions: false,
    wordWrapColumn: 40,
    tabSize: 4,
    insertSpaces: false,
    detectIndentation: false,
    folding: true,
    foldingHighlight: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'mouseover',
    disableLayerHinting: true, // 等宽优
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    overviewRulerLanes: 0,
    renderLineHighlight: 'none',
    occurrencesHighlight: 'off',
    bracketPairColorization: {
      enabled: false
    },
    scrollbar: {
      useShadows: false,
      horizontalScrollbarSize: 8,
      verticalScrollbarSize: 8
    },
    // We are not utilizing the native support for dropping (`dragAndDrop` & `dropIntoEditor`) of Monaco,
    // instead we handle the drag & drop events, implement drop-indicator & scroll-on-drag by ourselves,
    // because:
    // 1. The native support is not flexible enough for our use case:
    //   - There's no way to customize the drop indicator UI
    //   - There's no way to prevent the default drop behavior
    //   - The related API `onDropIntoEditor` is not public yet. See details in https://github.com/microsoft/monaco-editor/issues/3359
    // 2. There's bug with the native support since v0.46.0. See details in https://github.com/microsoft/monaco-editor/issues/4386
    dragAndDrop: false,
    dropIntoEditor: {
      enabled: false
    },
    stickyScroll: {
      enabled: false
    },
    unicodeHighlight: {
      ambiguousCharacters: false // Disable highlighting of ambiguous characters (like Chinese punctuation)
    },
    ...props.options
  })

  const handleResize = debounce(() => {
    editor.layout()
  }, 300)
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(editorEl)

  emit('init', editor)
  onClenaup(() => {
    editor.dispose()
    resizeObserver.disconnect()
  })
})
</script>

<template>
  <div ref="editorElRef" class="monaco-editor-conflict-free"></div>
</template>

<style lang="scss">
.monaco-editor-conflict-free > .monaco-editor {
  // remove the default outline of monaco editor
  outline: none;
}
</style>
