/**
 * @desc spx-specific context setup for XGo Code Editor.
 * Wires all 8 spx providers and creates the CodeEditor instance.
 */

import { useI18n } from '@/utils/i18n'
import { composeQuery, useQuery, type QueryRet } from '@/utils/query'
import type { SpxProject } from '@/models/spx/project'
import { loadMonaco, CodeEditor, DocumentBase, useProvideCodeEditor } from '../xgo-code-editor'
import * as spxDefinitionsByName from './document-base'
import './document-base/helpers' // for side effects of registering definitions
import { keys as spxKeyDefinitions } from './document-base/key'
import { SpxLSPClient } from './lsp/spx-lsp-client'
import { SpxCodeEditorProject } from './spx-project'
import { SpxAPIReferenceProvider } from './api-reference'
import { SpxDiagnosticsProvider } from './diagnostics'
import { SpxResourceProvider } from './resource'
import { SpxInputHelperProvider } from './input-helper'
import { SpxSnippetVariablesProvider } from './snippet-variables'
import type { History } from '../../history'
import type { Runtime } from '../../runtime'

export type SpxEditorState = {
  project: SpxProject
  history: History
  runtime: Runtime
}

/**
 * Provides the full spx-specific Code Editor context.
 * Creates all providers plus the CodeEditor instance, and injects them via the generic context key.
 */
export function useProvideCodeEditorCtx(editorStateRet: QueryRet<SpxEditorState>): QueryRet<CodeEditor> {
  const i18n = useI18n()

  const editorQueryRet = useQuery<CodeEditor>(
    async (ctx) => {
      const [{ project: spxProject, history, runtime }, monaco] = await Promise.all([
        composeQuery(ctx, editorStateRet, [null, 0]),
        loadMonaco(i18n.lang.value)
      ])
      ctx.signal.throwIfAborted()
      const project = new SpxCodeEditorProject(spxProject, history)
      const lspClient = new SpxLSPClient(spxProject)
      // Listen to property rename events to update monitor widgets that reference the renamed variable.
      lspClient.onPropertyRenamed(({ target, oldName, newName }) => {
        // NOTE: No need to go through history.doAction here. This event is a side effect of
        // a rename action that already has its own history entry. History is snapshot-based, so
        // undo/redo will restore the full model state (including monitor variableName) correctly.
        // P.S. The LSP server ensures the notification fires before the rename response,
        // so this runs before the history snapshot is taken — no risk of interleaving changes.
        for (const widget of spxProject.stage.widgets) {
          if (widget.type === 'monitor' && widget.target === target && widget.variableName === oldName) {
            widget.setVariableName(newName)
          }
        }
      })
      lspClient.init()
      const documentBase = new DocumentBase([...Object.values(spxDefinitionsByName), ...spxKeyDefinitions])
      const resourceProvider = new SpxResourceProvider(lspClient, spxProject)
      const snippetVariablesProvider = new SpxSnippetVariablesProvider(spxProject)
      const codeEditor = new CodeEditor({
        project,
        monaco,
        lspClient,
        documentBase,
        resourceProvider,
        inputHelperProvider: new SpxInputHelperProvider(lspClient, resourceProvider),
        apiReferenceProvider: new SpxAPIReferenceProvider(documentBase),
        diagnosticsProvider: new SpxDiagnosticsProvider(runtime, lspClient, project),
        snippetVariablesProvider
      })
      snippetVariablesProvider.setPropertiesLoader((target, signal) => codeEditor.getProperties(target, signal))
      codeEditor.disposeOnSignal(ctx.signal)
      return codeEditor
    },
    { en: 'Failed to load code editor', zh: '加载代码编辑器失败' }
  )
  useProvideCodeEditor(editorQueryRet.data)
  return editorQueryRet
}

export { useCodeEditor, useCodeEditorRef } from '../xgo-code-editor'
