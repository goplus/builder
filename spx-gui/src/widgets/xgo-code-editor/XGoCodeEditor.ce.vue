<template>
  <UIConfigProvider :config="uiConfig">
    <UIMessageProvider>
      <UIModalProvider>
        <div class="relative w-full min-h-120 overflow-hidden rounded-xl border border-black/12 bg-white">
          <UILoading v-if="isLoading" cover mask="solid" />
          <UIError v-else-if="error != null" cover :retry="refetch">
            {{ $t(error.userMessage) }}
          </UIError>
          <div v-else-if="codeEditorRef != null && codeFilePath != null" class="flex h-160 w-full flex-col">
            <div class="border-b border-dividing-line-2 px-3 py-2">
              <UITabRadioGroup v-model:value="codeFilePath">
                <UITabRadio v-for="p in codeFilePaths" :key="p" :value="p" class="min-w-fit px-3">
                  {{ filename(p) }}
                </UITabRadio>
              </UITabRadioGroup>
            </div>
            <CodeEditorUI class="w-full flex-[1_1_0]" :code-file-path="codeFilePath" />
          </div>
        </div>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { filename } from '@/utils/path'
import { useQuery } from '@/utils/query'
import { SpxProject } from '@/models/spx/project'
import { cloudHelpers } from '@/models/common/cloud'
import { History } from '@/components/editor/history'
import * as spxDefinitionsByName from '@/components/editor/spx-code-editor/document-base'
import { keys as spxKeyDefinitions } from '@/components/editor/spx-code-editor/document-base/key'
import { SpxCodeEditorProject, SpxLSPClient } from '@/components/editor/spx-code-editor'
import {
  type Config,
  UIConfigProvider,
  UIError,
  UILoading,
  UIMessageProvider,
  UIModalProvider,
  UITabRadio,
  UITabRadioGroup
} from '@/components/ui'
import { CodeEditor, CodeEditorUI, DocumentBase, loadMonaco, useProvideCodeEditor } from '@/components/xgo-code-editor'
import { getUIConfig } from '@/setup'

const widgetProjectOwner = 'nighca'
const widgetProjectName = 'niu-run'

const i18n = useI18n()
const uiConfig = computed<Config>(() => getUIConfig(i18n))

const {
  data: codeEditorRef,
  isLoading,
  error,
  refetch
} = useQuery(
  async (ctx) => {
    const [monaco, serialized] = await Promise.all([
      loadMonaco(i18n.lang.value),
      cloudHelpers.load(widgetProjectOwner, widgetProjectName, true)
    ])

    const project = new SpxProject()
    await project.load(serialized)

    const history = new History(project)
    const lspClient = new SpxLSPClient(project)
    lspClient.init()
    const documentBase = new DocumentBase([...Object.values(spxDefinitionsByName), ...spxKeyDefinitions])

    const codeEditor = new CodeEditor({
      project: new SpxCodeEditorProject(project, history),
      history,
      monaco,
      lspClient,
      documentBase
    })
    codeEditor.disposeOnSignal(ctx.signal)
    lspClient.disposeOnSignal(ctx.signal)
    return codeEditor
  },
  { en: 'Load code editor failed', zh: '加载代码编辑器失败' }
)

useProvideCodeEditor(codeEditorRef)

const codeFilePath = ref<string | null>(null)
const codeFilePaths = computed(() => codeEditorRef.value?.project.getCodeFiles() ?? [])

watch(codeFilePaths, (newPaths) => {
  if (newPaths.length === 0) {
    codeFilePath.value = null
  } else if (codeFilePath.value == null || !newPaths.includes(codeFilePath.value)) {
    codeFilePath.value = newPaths[0]
  }
})
</script>

<style>
/*
 * Declare the layer order inside the widget stylesheet entry before importing app.css.
 * The widget renders in its own shadow root, so the document-level workaround in the app HTML entry
 * does not apply here; this prelude must be parsed inside the widget stylesheet itself.
 * See: https://github.com/vitejs/vite/issues/21903
 */
@layer theme, base, components, utilities;

@import '../../app.css';
@import 'monaco-editor/min/vs/editor/editor.main.css';

:host {
  display: block;
}
</style>
