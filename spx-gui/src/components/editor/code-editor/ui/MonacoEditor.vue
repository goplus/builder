<script lang="ts">
import { debounce } from 'lodash'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import loader from '@monaco-editor/loader'
import { untilNotNull } from '@/utils/utils'
import type { Monaco, MonacoEditor } from './common'

let monacoPromise: Promise<Monaco> | null = null

function getLoaderConfig(lang: Lang) {
  const loaderConfig = {
    paths: {
      vs: 'https://builder-static.gopluscdn.com/libs/monaco-editor/0.45.0/min/vs'
    }
  }
  if (lang === 'en') return loaderConfig
  const locale: string = {
    zh: 'zh-cn'
  }[lang]
  return {
    ...loaderConfig,
    'vs/nls': {
      availableLanguages: {
        '*': locale
      }
    }
  }
}

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  }
}
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n, type Lang } from '@/utils/i18n'

const emit = defineEmits<{
  init: [Monaco, MonacoEditor]
}>()

const i18n = useI18n()

async function getMonaco() {
  if (monacoPromise != null) return monacoPromise
  loader.config(getLoaderConfig(i18n.lang.value))
  return (monacoPromise = loader.init().then((monaco) => {
    // TODO: do general configuration for monaco here
    return monaco
  }))
}

const editorElRef = ref<HTMLDivElement>()

watchEffect(async (onClenaup) => {
  const [monaco, editorEl] = await Promise.all([getMonaco(), untilNotNull(editorElRef)])

  const editor = monaco.editor.create(editorEl, {
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
    quickSuggestions: false,
    wordWrapColumn: 40,
    tabSize: 4,
    insertSpaces: false,
    detectIndentation: false,
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

  const handleResize = debounce(() => {
    editor.layout()
  }, 300)
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(editorEl)

  emit('init', monaco, editor)
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
