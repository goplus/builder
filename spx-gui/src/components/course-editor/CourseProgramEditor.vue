<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { insertSpaces, tabSize, theme } from '@/utils/xgo/highlighter'
import type { Course } from '@/models/tutorial/course'
import { loadMonaco, type MonacoEditor, type monaco } from '@/components/xgo-code-editor'
import MonacoEditorComp from '@/components/xgo-code-editor/ui/MonacoEditor.vue'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  course: Course
}>()

const i18n = useI18n()

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

// Plain XGo text editing for now; completion and diagnostics wait for the Tutorial Language Server.
const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'xgo',
  theme,
  tabSize,
  insertSpaces,
  fontSize: 12,
  contextmenu: false
}

function handleEditorInit(editor: MonacoEditor) {
  // The editor is re-created when Monaco reloads (e.g. on language change), so always start from the
  // current code rather than whatever the component captured at setup.
  editor.setValue(props.course.code)
  const contentListener = editor.onDidChangeModelContent(() => {
    const code = editor.getValue()
    if (code !== props.course.code) props.course.setCode(code)
  })
  const stopModelSync = watch(
    () => props.course.code,
    (code) => {
      if (editor.getValue() !== code) editor.setValue(code)
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
    v-radar="{ name: 'Course program editor', desc: 'Code editor for the course program main_course.gox' }"
    class="h-full w-full"
    :monaco="monacoQueryRet.data.value"
    :options="editorOptions"
    @init="handleEditorInit"
  />
</template>
