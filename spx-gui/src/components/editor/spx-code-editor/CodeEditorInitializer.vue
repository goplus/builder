<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { CodeEditor } from '@/components/xgo-code-editor'
import { SpxAPIReferenceProvider } from './api-reference'
import { SpxDiagnosticsProvider } from './diagnostics'
import { SpxResourceAdapter, useResourceRenameHelpers, useResourceSelectorHelpers } from './resource'
import { SpxInputHelperProvider } from './input-helper'
import { SpxSnippetVariablesProvider } from './snippet-variables'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  codeEditor: CodeEditor
}>()

const editorCtx = useEditorCtx()
const resourceSelectorHelpers = useResourceSelectorHelpers()
const resourceRenameHelpers = useResourceRenameHelpers()

watch(
  () => props.codeEditor,
  (codeEditor, _, onCleanup) => {
    const { project: spxProject, runtime } = editorCtx.state
    const { documentBase, project, lspClient } = codeEditor
    const apiReferenceProvider = new SpxAPIReferenceProvider(documentBase)
    const diagnosticsProvider = new SpxDiagnosticsProvider(runtime, lspClient, project)
    const resourceAdapter = new SpxResourceAdapter(
      lspClient,
      editorCtx.state,
      resourceSelectorHelpers,
      resourceRenameHelpers
    )
    const inputHelperProvider = new SpxInputHelperProvider(lspClient, resourceAdapter)
    const snippetVariablesProvider = new SpxSnippetVariablesProvider(
      spxProject,
      lspClient,
      documentBase,
      project.classFramework.pkgPaths[0]
    )

    codeEditor.registerAPIReferenceProvider(apiReferenceProvider)
    codeEditor.registerDiagnosticsProvider(diagnosticsProvider)
    codeEditor.registerResourceAdapter(resourceAdapter)
    codeEditor.registerInputHelperProvider(inputHelperProvider)
    codeEditor.registerSnippetVariablesProvider(snippetVariablesProvider)

    onCleanup(() => {
      diagnosticsProvider.dispose()
    })
  },
  { immediate: true }
)
</script>
