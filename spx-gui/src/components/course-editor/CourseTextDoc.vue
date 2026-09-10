<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { insertSpaces, tabSize, theme } from '@/utils/xgo/highlighter'
import { loadMonaco, type MonacoEditor, type monaco } from '@/components/xgo-code-editor'
import MonacoEditorComp from '@/components/xgo-code-editor/ui/MonacoEditor.vue'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  text: string
  /** Monaco language id; falls back to plain text when the loaded Monaco does not know it. */
  language: string
}>()

const emit = defineEmits<{
  'update:text': [text: string]
}>()

const i18n = useI18n()

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

// Plain text editing for now; completion and diagnostics for course programs wait for the Tutorial Language Server.
const editorOptions = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => {
  const loaded = monacoQueryRet.data.value
  const known = loaded != null && loaded.languages.getLanguages().some((l) => l.id === props.language)
  return {
    language: known ? props.language : 'plaintext',
    theme,
    tabSize,
    insertSpaces,
    fontSize: 12,
    contextmenu: false
  }
})

function handleEditorInit(editor: MonacoEditor) {
  // The editor is re-created when Monaco reloads (e.g. on language change), so always start from the
  // current text rather than whatever the component captured at setup.
  editor.setValue(props.text)
  const contentListener = editor.onDidChangeModelContent(() => {
    const text = editor.getValue()
    if (text !== props.text) emit('update:text', text)
  })
  const stopModelSync = watch(
    () => props.text,
    (text) => {
      if (editor.getValue() !== text) editor.setValue(text)
    }
  )
  editor.onDidDispose(() => {
    contentListener.dispose()
    stopModelSync()
  })
}
</script>

<template>
  <UIDetailedLoading v-if="monacoQueryRet.isLoading.value" :percentage="monacoQueryRet.progress.value.percentage">
    <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
  </UIDetailedLoading>
  <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
    {{ $t(monacoQueryRet.error.value.userMessage) }}
  </UIError>
  <MonacoEditorComp
    v-else-if="monacoQueryRet.data.value != null"
    v-radar="{ name: 'Text editor', desc: 'Code editor for the open text file' }"
    class="h-full w-full"
    :monaco="monacoQueryRet.data.value"
    :options="editorOptions"
    @init="handleEditorInit"
  />
</template>
