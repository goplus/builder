import type { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import type { EditorCtx } from './EditorContextProvider.vue'
import {
  DiagnosticSeverity,
  getCodeFilePath,
  isSelectionEmpty,
  textDocumentId2CodeFileName,
  type CodeEditor,
  type Position
} from './spx-code-editor'

export interface ProjectContentDiagnosticContext {
  sprites: string[]
  sounds: string[]
  backdrops: string[]
  widgets: string[]
  physicsEnabled: boolean
}

export interface ProjectDiagnosticContext {
  identifier?: string
  type: string
  displayName: string
  content: ProjectContentDiagnosticContext
}

export interface SpriteDiagnosticContext {
  name: string
  costumes: string[]
  animations: string[]
  heading: number
  x: number
  y: number
  size: number
  rotationStyle: string
  visible: boolean
  codeLinesNum: number
}

export interface SampledCode {
  lineCount: number
  sampledLines: Record<string, string>
}

export interface ActiveCodeDiagnosticContext {
  file: string
  cursor?: Position
  selection?: {
    start: Position
    end: Position
  }
  sample: SampledCode
}

export interface CodeDiagnosticContext {
  file: string
  severity: 'error' | 'warning'
  line: number
  message: string
}

export interface RuntimeOutputDiagnosticContext {
  time: string
  kind: 'log' | 'error'
  file?: string
  line?: number
  message: string
}

export interface RuntimeOutputsDiagnosticContext {
  total: number
  outputs: RuntimeOutputDiagnosticContext[]
}

export interface EditorDiagnosticContext {
  project?: ProjectDiagnosticContext
  selectedSprite?: SpriteDiagnosticContext
  code?: ActiveCodeDiagnosticContext
  diagnostics?: CodeDiagnosticContext[]
  runtimeOutputs: RuntimeOutputsDiagnosticContext
}

export function getProjectDiagnosticContext(project: SpxProject): ProjectDiagnosticContext {
  const identifier = project.owner == null || project.name == null ? undefined : `${project.owner}/${project.name}`
  return {
    ...(identifier == null ? {} : { identifier }),
    type: String(project.type),
    displayName: project.displayName,
    content: {
      sprites: project.sprites.map((sprite) => sprite.name),
      sounds: project.sounds.map((sound) => sound.name),
      backdrops: project.stage.backdrops.map((backdrop) => backdrop.name),
      widgets: project.stage.widgets.map((widget) => widget.name),
      physicsEnabled: project.stage.physics.enabled
    }
  }
}

export function getSpriteDiagnosticContext(sprite: Sprite): SpriteDiagnosticContext {
  return {
    name: sprite.name,
    costumes: sprite.costumes.map((costume) => costume.name),
    animations: sprite.animations.map((animation) => animation.name),
    heading: sprite.heading,
    x: sprite.x,
    y: sprite.y,
    size: sprite.size,
    rotationStyle: sprite.rotationStyle,
    visible: sprite.visible,
    codeLinesNum: sprite.code.split(/\r?\n/).length
  }
}

export function sampleCode(code: string, { lineStart = 1, lineEnd }: { lineStart?: number; lineEnd?: number } = {}) {
  const allLines = code.split(/\r?\n/)
  const sampledLines = allLines.slice(lineStart - 1, lineEnd).reduce<Record<string, string>>((result, line, index) => {
    result[index + lineStart] = line
    return result
  }, {})
  return {
    lineCount: allLines.length,
    sampledLines
  }
}

export function getActiveCodeDiagnosticContext(codeEditor: CodeEditor): ActiveCodeDiagnosticContext | null {
  const editorUI = codeEditor.getAttachedUI()
  const activeTextDocument = editorUI?.activeTextDocument
  if (editorUI == null || activeTextDocument == null) return null

  const { cursorPosition, selection } = editorUI
  const activeLine = cursorPosition?.line ?? 1
  const threshold = 10
  const lineStart = Math.max(activeLine - threshold, 1)
  return {
    file: getCodeFilePath(activeTextDocument.id.uri),
    ...(cursorPosition == null ? {} : { cursor: { ...cursorPosition } }),
    ...(selection == null || isSelectionEmpty(selection)
      ? {}
      : { selection: { start: { ...selection.start }, end: { ...selection.position } } }),
    sample: sampleCode(activeTextDocument.getValue(), {
      lineStart,
      lineEnd: lineStart + threshold * 2
    })
  }
}

export function getRuntimeOutputsDiagnosticContext(
  editorCtx: EditorCtx | null,
  limit = 50
): RuntimeOutputsDiagnosticContext {
  const outputs = editorCtx?.state.runtime.outputs ?? []
  return {
    total: outputs.length,
    outputs: outputs.slice(-limit).map((output) => ({
      time: new Date(output.time).toISOString(),
      kind: output.kind,
      ...(output.source == null
        ? {}
        : {
            file: textDocumentId2CodeFileName(output.source.textDocument).en,
            line: output.source.range.start.line
          }),
      message: output.message
    }))
  }
}

export async function getCodeDiagnosticsDiagnosticContext(codeEditor: CodeEditor): Promise<CodeDiagnosticContext[]> {
  const diagnostics = await codeEditor.diagnosticWorkspace()
  return diagnostics.items.flatMap((item) =>
    item.diagnostics.map((diagnostic) => ({
      file: textDocumentId2CodeFileName(item.textDocument).en,
      severity: diagnostic.severity === DiagnosticSeverity.Warning ? ('warning' as const) : ('error' as const),
      line: diagnostic.range.start.line,
      message: diagnostic.message
    }))
  )
}

export async function captureEditorDiagnosticContext(
  editorCtx: EditorCtx | null,
  codeEditor: CodeEditor | null
): Promise<EditorDiagnosticContext> {
  const project = editorCtx?.project
  const selectedSprite = editorCtx?.state.selectedSprite
  const code = codeEditor == null ? null : getActiveCodeDiagnosticContext(codeEditor)
  const context: EditorDiagnosticContext = {
    ...(project == null ? {} : { project: getProjectDiagnosticContext(project) }),
    ...(selectedSprite == null ? {} : { selectedSprite: getSpriteDiagnosticContext(selectedSprite) }),
    ...(code == null ? {} : { code }),
    runtimeOutputs: getRuntimeOutputsDiagnosticContext(editorCtx)
  }

  if (codeEditor != null) {
    try {
      const diagnostics = await getCodeDiagnosticsDiagnosticContext(codeEditor)
      if (diagnostics.length > 0) context.diagnostics = diagnostics
    } catch {
      // Context capture must still work when the editor's language server is unavailable.
    }
  }

  return context
}
