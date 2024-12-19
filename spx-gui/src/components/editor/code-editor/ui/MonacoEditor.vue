<script lang="ts">
import { debounce } from 'lodash'
import { untilNotNull } from '@/utils/utils'
import { type Monaco, type MonacoEditor, type monaco as tmonaco } from '../monaco'

export type InitData = [editor: MonacoEditor, editorEl: HTMLElement]
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  monaco: Monaco
  options: tmonaco.editor.IStandaloneEditorConstructionOptions
}>()

const emit = defineEmits<{
  init: InitData
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
    cursorStyle: 'line', // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true,
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false,
    quickSuggestions: false,
    wordWrapColumn: 40,
    tabSize: 4,
    insertSpaces: false,
    detectIndentation: false,
    folding: true, // code folding
    foldingHighlight: true, // 折叠等高线
    foldingStrategy: 'indentation', // 折叠方式 auto | indentation
    showFoldingControls: 'mouseover', // 是否一直显示折叠 always | mouseover
    disableLayerHinting: true, // 等宽优
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    overviewRulerLanes: 0,
    renderLineHighlight: 'none',
    bracketPairColorization: {
      enabled: false
    },
    scrollbar: {
      useShadows: false,
      horizontalScrollbarSize: 8,
      verticalScrollbarSize: 8
    },
    ...props.options
  })

  const handleResize = debounce(() => {
    editor.layout()
  }, 300)
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(editorEl)

  emit('init', editor, editorEl)
  onClenaup(() => {
    editor.dispose()
    resizeObserver.disconnect()
  })
})
</script>

<template>
  <div ref="editorElRef" class="monaco-editor"></div>
</template>

<style lang="scss" scoped></style>
