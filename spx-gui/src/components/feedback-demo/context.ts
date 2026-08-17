import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
import {
  captureEditorDiagnosticContext,
  type ActiveCodeDiagnosticContext,
  type CodeDiagnosticContext,
  type ProjectDiagnosticContext,
  type RuntimeOutputDiagnosticContext,
  type SpriteDiagnosticContext
} from '@/components/editor/diagnostic-context'
import type { CodeEditor } from '@/components/editor/spx-code-editor'

const feedbackContextTextMaxLength = 500

function sanitizeFeedbackText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, feedbackContextTextMaxLength)
}

export interface FeedbackContext {
  version: 2
  capturedAt: string
  page: {
    fullPath: string
    language: 'zh' | 'en'
  }
  project?: ProjectDiagnosticContext
  selectedSprite?: SpriteDiagnosticContext
  code?: ActiveCodeDiagnosticContext
  diagnostics?: CodeDiagnosticContext[]
  runtimeOutputs?: RuntimeOutputDiagnosticContext[]
}

export async function captureFeedbackContext(
  editorCtx: EditorCtx | null,
  codeEditor: CodeEditor | null,
  fullPath: string,
  language: 'zh' | 'en'
): Promise<FeedbackContext> {
  const editorContext = await captureEditorDiagnosticContext(editorCtx, codeEditor)
  return {
    version: 2,
    capturedAt: new Date().toISOString(),
    page: { fullPath, language },
    ...(editorContext.project == null ? {} : { project: editorContext.project }),
    ...(editorContext.selectedSprite == null ? {} : { selectedSprite: editorContext.selectedSprite }),
    ...(editorContext.code == null ? {} : { code: editorContext.code }),
    ...(editorContext.diagnostics == null
      ? {}
      : {
          diagnostics: editorContext.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            message: sanitizeFeedbackText(diagnostic.message)
          }))
        }),
    ...(editorContext.runtimeOutputs.outputs.length === 0
      ? {}
      : {
          runtimeOutputs: editorContext.runtimeOutputs.outputs.map((output) => ({
            ...output,
            message: sanitizeFeedbackText(output.message)
          }))
        })
  }
}
