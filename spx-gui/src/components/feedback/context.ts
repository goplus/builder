import { z } from 'zod'

import { withTimeout } from '@/utils/disposable'
import type { Lang } from '@/utils/i18n'
import { unicodeSafeSlice } from '@/utils/utils'
import { fullName, type SpxProject } from '@/models/spx/project'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import { DiagnosticSeverity, getCodeFilePath, type CodeEditor } from '@/components/editor/spx-code-editor'

const feedbackSourceSchema = z.enum(['profileMenu'])

/** Feature and entry point from which the Feedback form was opened. */
export type FeedbackSource = z.infer<typeof feedbackSourceSchema>

const projectContextSchema = z.object({
  /** Project identifier in the form of `owner/name`, absent for unsaved projects */
  identifier: z.string().optional(),
  displayName: z.string()
})
type ProjectContext = z.infer<typeof projectContextSchema>

const diagnosticContextSchema = z.object({
  file: z.string(),
  severity: z.nativeEnum(DiagnosticSeverity),
  line: z.number(),
  message: z.string()
})
type DiagnosticContext = z.infer<typeof diagnosticContextSchema>

const runtimeOutputContextSchema = z.object({
  time: z.string(),
  kind: z.nativeEnum(RuntimeOutputKind),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string()
})
type RuntimeOutputContext = z.infer<typeof runtimeOutputContextSchema>

/**
 * Schema of the diagnostic information captured when the user submits Feedback.
 * Context is stored as submitted, so readers should parse it with this schema.
 */
export const feedbackContextSchema = z.object({
  source: feedbackSourceSchema,
  page: z.object({
    path: z.string(),
    language: z.enum(['en', 'zh'])
  }),
  project: projectContextSchema.optional(),
  diagnostics: z.array(diagnosticContextSchema).optional(),
  runtimeOutputs: z.array(runtimeOutputContextSchema).optional()
})

export type FeedbackContext = z.infer<typeof feedbackContextSchema>

const maxDiagnostics = 50
const maxRuntimeOutputs = 50
// Keep a few long messages from using up the size budget.
const maxTextLength = 500
const diagnosticsTimeout = 3_000 // ms
const optionalContextKeys = ['project', 'diagnostics', 'runtimeOutputs'] as const

// U+0000 is removed because the server cannot store it in JSON text.
function toContextText(text: string) {
  return unicodeSafeSlice(text.replaceAll('\0', ''), 0, maxTextLength)
}

function getEncodedSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** Drops the largest optional items until the encoded Context fits within `maxSize`. */
function fitContextSize(context: FeedbackContext, maxSize: number) {
  const items = optionalContextKeys
    .filter((key) => context[key] != null)
    .map((key) => ({ key, size: getEncodedSize(context[key]) }))
    .sort((a, b) => b.size - a.size)
  for (const { key } of items) {
    if (getEncodedSize(context) <= maxSize) return
    delete context[key]
  }
}

function getProjectContext(project: SpxProject): ProjectContext {
  return {
    ...(project.owner != null && project.name != null ? { identifier: fullName(project.owner, project.name) } : {}),
    displayName: project.displayName
  }
}

async function getDiagnosticsContext(codeEditor: CodeEditor): Promise<DiagnosticContext[]> {
  const { items } = await withTimeout(diagnosticsTimeout, (signal) => codeEditor.diagnosticWorkspace(signal))
  return items
    .flatMap((item) =>
      item.diagnostics.map((diagnostic) => ({
        file: getCodeFilePath(item.textDocument.uri),
        severity: diagnostic.severity,
        line: diagnostic.range.start.line,
        message: toContextText(diagnostic.message)
      }))
    )
    .slice(0, maxDiagnostics)
}

function getRuntimeOutputsContext(outputs: readonly RuntimeOutput[]): RuntimeOutputContext[] {
  return outputs.slice(-maxRuntimeOutputs).map((output) => ({
    time: new Date(output.time).toISOString(),
    kind: output.kind,
    ...(output.source != null
      ? { file: getCodeFilePath(output.source.textDocument.uri), line: output.source.range.start.line }
      : {}),
    message: toContextText(output.message)
  }))
}

export async function captureFeedbackContext({
  source,
  path,
  language,
  editorCtx,
  codeEditor,
  maxSize
}: {
  source: FeedbackSource
  /** Full path of the current page */
  path: string
  language: Lang
  /** Context of the editor, null when Feedback is opened outside of the editor */
  editorCtx: EditorCtx | null
  codeEditor: CodeEditor | null
  /** Maximum size of the JSON-encoded Context in bytes */
  maxSize: number
}): Promise<FeedbackContext> {
  const context: FeedbackContext = {
    source,
    page: { path, language }
  }
  if (editorCtx != null) {
    context.project = getProjectContext(editorCtx.project)
    const runtimeOutputs = getRuntimeOutputsContext(editorCtx.state.runtime.outputs)
    if (runtimeOutputs.length > 0) context.runtimeOutputs = runtimeOutputs
  }
  if (codeEditor != null) {
    try {
      const diagnostics = await getDiagnosticsContext(codeEditor)
      if (diagnostics.length > 0) context.diagnostics = diagnostics
    } catch {
      // Diagnostics are optional, Feedback can still be submitted without them.
    }
  }
  fitContextSize(context, maxSize)
  return context
}
