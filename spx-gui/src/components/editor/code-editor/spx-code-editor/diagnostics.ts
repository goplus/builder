/**
 * @desc SpxDiagnosticsProvider — spx-specific diagnostics provider.
 * Extends the xgo DiagnosticsProvider with runtime diagnostics from the spx game engine
 * and adds a WeakMap cache over the LSP workspace diagnostic report.
 */

import { hashFiles } from '@/models/common/hash'
import { RuntimeOutputKind, type Runtime } from '@/components/editor/runtime'
import {
  type Diagnostic,
  type ITextDocument,
  type Range,
  type Position,
  type IXGoProject,
  textDocumentIdEq,
  DiagnosticSeverity,
  DiagnosticsProvider,
  type DiagnosticsContext,
  type ILSPClient
} from '../xgo-code-editor'

export class SpxDiagnosticsProvider extends DiagnosticsProvider {
  constructor(
    private runtime: Runtime,
    lspClient: ILSPClient,
    project: IXGoProject
  ) {
    super(lspClient, project)

    this.addDisposer(
      this.runtime.on('didChangeOutput', () => {
        this.emit('didChangeDiagnostics')
      })
    )
  }

  private adaptRuntimeDiagnosticRange({ start, end }: Range, textDocument: ITextDocument) {
    // Expand the range to whole line because the range from runtime is not accurate.
    // TODO: it's a workaround, should be fixed in the runtime (ispx) side
    if (start.line !== end.line) return { start, end }
    const line = textDocument.getLineContent(start.line)
    const leadingSpaces = line.match(/^\s*/)?.[0] ?? ''
    const lineStartPos: Position = { line: start.line, column: leadingSpaces.length + 1 }
    const lineEndPos: Position = { line: start.line, column: line.length + 1 }
    return { start: lineStartPos, end: lineEndPos }
  }

  private async getRuntimeDiagnostics(ctx: DiagnosticsContext) {
    const { outputs, filesHash } = this.runtime
    const currentFilesHash = await hashFiles(this.project.exportFiles(), ctx.signal)
    if (filesHash !== currentFilesHash) return []
    const diagnostics: Diagnostic[] = []
    for (const output of outputs) {
      if (output.kind !== RuntimeOutputKind.Error) continue
      if (output.source == null) continue
      if (!textDocumentIdEq(output.source.textDocument, ctx.textDocument.id)) continue
      const range = this.adaptRuntimeDiagnosticRange(output.source.range, ctx.textDocument)
      diagnostics.push({
        message: output.message,
        range,
        severity: DiagnosticSeverity.Error
      })
    }
    return diagnostics
  }

  override async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
    const [runtimeDiagnostics, lspDiagnostics] = await Promise.all([
      this.getRuntimeDiagnostics(ctx),
      super.provideDiagnostics(ctx)
    ])
    return [...runtimeDiagnostics, ...lspDiagnostics]
  }
}
