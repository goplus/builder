<script setup lang="ts">
/** A controlled plain-text Monaco editor for a text file of the course, such as the course program. */
import { computed, watch } from 'vue'
import { debounce } from 'lodash'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { insertSpaces, tabSize, theme } from '@/utils/xgo/highlighter'
import { loadMonaco, type MonacoEditor, type monaco } from '@/components/xgo-code-editor'
import MonacoEditorComp from '@/components/xgo-code-editor/ui/MonacoEditor.vue'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  /** The current text; the component follows it and reports edits through `update:text`. */
  text: string
  /** Monaco language id; falls back to plain text when the loaded Monaco does not know it. */
  language: string
}>()

const emit = defineEmits<{
  /** The author edited the content; carries the complete new text. */
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
  // Only languages the loaded Monaco knows are valid ids; anything else would make Monaco warn and fall back.
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

// Runs outside setup, so the `watch` below is not tied to the component scope and is stopped by hand on dispose.
function handleEditorInit(editor: MonacoEditor) {
  // The editor is re-created when Monaco reloads (e.g. on language change), so always start from the
  // current text rather than whatever the component captured at setup.
  editor.setValue(props.text)
  // Right after a `setValue` from the sync below the content equals `props.text`; do not echo it back.
  const contentListener = editor.onDidChangeModelContent(() => {
    const text = editor.getValue()
    if (text !== props.text) emit('update:text', text)
  })
  // Edits may come back asynchronously (the parent records them in a history first), so an input method inserting
  // two characters at once would see the first come back while the editor already shows both, and replacing the
  // content would move the cursor. Syncing after a short pause lets edits settle first, as
  // `xgo-code-editor/text-document.ts` does.
  const syncFromText = debounce(() => {
    if (editor.getValue() !== props.text) editor.setValue(props.text)
  }, 100)
  const stopModelSync = watch(() => props.text, syncFromText)
  // `MonacoEditorComp` disposes the editor on unmount and re-creation.
  editor.onDidDispose(() => {
    contentListener.dispose()
    stopModelSync()
    syncFromText.cancel()
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
    v-radar="{ name: 'text-editor', desc: 'Code editor for the open text file' }"
    class="h-full w-full"
    :monaco="monacoQueryRet.data.value"
    :options="editorOptions"
    @init="handleEditorInit"
  />
</template>
