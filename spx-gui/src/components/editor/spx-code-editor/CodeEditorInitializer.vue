<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { parseDefinitionId, type CodeEditor } from '@/components/xgo-code-editor'
import { FilteredCompletionProvider } from './api-filter'
import { SpxAPIReferenceProvider } from './api-reference'
import { SpxDiagnosticsProvider } from './diagnostics'
import { SpxResourceAdapter, useResourceRenameHelpers, useResourceSelectorHelpers } from './resource'
import { SpxInputHelperProvider } from './input-helper'
import { SpxSnippetVariablesProvider } from './snippet-variables'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  codeEditor: CodeEditor
  apiWhitelist: string[] | null
}>()

const editorCtx = useEditorCtx()
const resourceSelectorHelpers = useResourceSelectorHelpers()
const resourceRenameHelpers = useResourceRenameHelpers()

watch(
  () => props.codeEditor,
  (codeEditor, _, onCleanup) => {
    const { project: spxProject, runtime } = editorCtx.state
    const { documentBase, project, lspClient } = codeEditor
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

    codeEditor.registerDiagnosticsProvider(diagnosticsProvider)
    codeEditor.registerResourceAdapter(resourceAdapter)
    codeEditor.registerInputHelperProvider(inputHelperProvider)
    codeEditor.registerSnippetVariablesProvider(snippetVariablesProvider)

    const completionProvider = codeEditor.completionProvider
    const stopAPIWatch = watch(
      () => props.apiWhitelist,
      (apiWhitelist) => {
        const whitelist = apiWhitelist == null ? null : apiWhitelist.map(parseDefinitionId)
        codeEditor.registerAPIReferenceProvider(new SpxAPIReferenceProvider(documentBase, whitelist))
        codeEditor.registerCompletionProvider(
          whitelist == null ? completionProvider : new FilteredCompletionProvider(completionProvider, whitelist)
        )
      },
      { immediate: true }
    )

    onCleanup(() => {
      stopAPIWatch()
      diagnosticsProvider.dispose()
    })
  },
  { immediate: true }
)
</script>
