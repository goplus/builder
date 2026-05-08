<template>
  <CodeEditorInitializer v-if="codeEditorRef != null" :code-editor="codeEditorRef" />
  <slot></slot>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useCopilot } from '@/components/copilot/context'
import { type Monaco, CodeEditor, DocumentBase, useProvideCodeEditor } from '@/components/xgo-code-editor'
import { useEditorCtx } from '../EditorContextProvider.vue'
import * as spxDefinitionsByName from './document-base'
import './document-base/helpers'
import { keys as spxKeyDefinitions } from './document-base/key'
import { SpxLSPClient } from './lsp/spx-lsp-client'
import { SpxCodeEditorProject } from './spx-project'
import CodeEditorInitializer from './CodeEditorInitializer.vue'

const props = defineProps<{
  monaco: Monaco
}>()

const copilot = useCopilot()
const editorCtx = useEditorCtx()
const codeEditorRef = shallowRef<CodeEditor | null>(null)

watch(
  () => [props.monaco, editorCtx.state] as const,
  ([monaco, editorState], _, onCleanup) => {
    const { project: spxProject, history } = editorState

    const project = new SpxCodeEditorProject(spxProject, history)
    const lspClient = new SpxLSPClient(spxProject)
    lspClient.onPropertyRenamed(({ target, oldName, newName }) => {
      for (const widget of spxProject.stage.widgets) {
        if (widget.type === 'monitor' && widget.target === target && widget.variableName === oldName) {
          widget.setVariableName(newName)
        }
      }
    })
    lspClient.init()

    const documentBase = new DocumentBase([...Object.values(spxDefinitionsByName), ...spxKeyDefinitions])
    const codeEditor = new CodeEditor({
      project,
      history,
      copilot,
      monaco,
      lspClient,
      documentBase
    })
    codeEditorRef.value = codeEditor
    onCleanup(() => {
      if (codeEditorRef.value === codeEditor) codeEditorRef.value = null
      codeEditor.dispose()
      lspClient.dispose()
    })
  },
  { immediate: true }
)

useProvideCodeEditor(codeEditorRef)
</script>
