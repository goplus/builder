<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { useMessageHandle } from '@/utils/exception'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { History } from '@/components/editor/history'
import {
  CodeEditor,
  CodeEditorUI,
  CompletionProvider,
  getTextDocumentId,
  loadMonaco,
  useProvideCodeEditor
} from '@/components/xgo-code-editor'
import { UIButton, UIDetailedLoading, UIError } from '@/components/ui'
import { createTutorialLSPClient, TutorialCodeEditorProject } from './code-editor'

const props = defineProps<{ project: TutorialProject; history: History }>()
const i18n = useI18n()
const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})
const codeEditor = shallowRef<CodeEditor | null>(null)

watch(
  () => [monacoQueryRet.data.value, props.project, props.history] as const,
  ([monaco, project, history], _, onCleanup) => {
    if (monaco == null) return
    const editorProject = new TutorialCodeEditorProject(project, history)
    const lspClient = createTutorialLSPClient(editorProject)
    lspClient.init()
    const editor = new CodeEditor({ project: editorProject, history, monaco, lspClient })
    editor.registerCompletionProvider(
      new CompletionProvider(lspClient, editor.documentBase, editorProject.classFramework, {
        includeUndocumentedFrameworkAPIs: true
      })
    )
    codeEditor.value = editor
    onCleanup(() => {
      codeEditor.value = null
      editor.dispose()
    })
  },
  { immediate: true }
)
useProvideCodeEditor(codeEditor, { appWide: false })

const handleFormat = useMessageHandle(
  async () => {
    const editor = codeEditor.value
    if (editor == null) return
    await editor.history.doAction({ name: { en: 'Format code', zh: '格式化代码' } }, () =>
      editor.formatTextDocument(getTextDocumentId(mainCourseFilePath))
    )
  },
  { en: 'Failed to format, please check the code', zh: '格式化失败，请检查代码' }
)
</script>

<template>
  <UIDetailedLoading v-if="monacoQueryRet.isLoading.value" :percentage="monacoQueryRet.progress.value.percentage">
    <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
  </UIDetailedLoading>
  <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
    {{ $t(monacoQueryRet.error.value.userMessage) }}
  </UIError>
  <template v-else-if="codeEditor != null">
    <div class="flex justify-end border-b border-dividing-line-2 p-2">
      <UIButton
        v-radar="{ name: 'format-button', desc: 'Click to format the course program' }"
        type="white"
        :loading="handleFormat.isLoading.value"
        @click="handleFormat.fn"
      >
        {{ $t({ en: 'Format', zh: '格式化' }) }}
      </UIButton>
    </div>
    <CodeEditorUI :key="i18n.lang.value" :code-file-path="mainCourseFilePath" :show-api-reference="false" />
  </template>
</template>
