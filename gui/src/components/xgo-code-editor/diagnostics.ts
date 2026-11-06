/**
 * @desc IDiagnosticsProvider interface + DiagnosticsProvider default implementation.
 * Uses ILSPClient. No spx-specific knowledge.
 */

import * as lsp from 'vscode-languageserver-protocol'
import Emitter from '@/utils/emitter'
import type { Files } from '@/models/common/file'
import type { BaseContext, Diagnostic, ITextDocument, Range } from './common'
import { fromLSPDiagnostic, positionEq } from './common'
import type { ILSPClient, RequestContext } from './lsp/types'
import type { IXGoProject } from './project'

export type DiagnosticsContext = BaseContext

export interface IDiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: void
  }> {
  provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]>
}

export class DiagnosticsProvider extends Emitter<{ didChangeDiagnostics: void }> implements IDiagnosticsProvider {
  /**
   * Cache for LSP workspace diagnostic reports.
   * Keyed by the `Files` object returned by `project.exportFiles()`.
   * Relies on `exportFiles()` reference-stability: same project state → same object reference.
   */
  private workspaceDiagnosticReportCache = new WeakMap<Files, Promise<lsp.WorkspaceDiagnosticReport>>()

  constructor(
    protected lspClient: ILSPClient,
    protected project: IXGoProject
  ) {
    super()
  }

  private adaptLSDiagnosticRange({ start, end }: Range, textDocument: ITextDocument): Range {
    // make sure the range is not empty, so that the diagnostic info can be displayed as inline decorations
    // TODO: it's a workaround, should be fixed in the server side
    if (positionEq(start, end)) {
      const code = textDocument.getValue()
      let offsetStart = textDocument.getOffsetAt(start)
      let offsetEnd = offsetStart
      let adaptedByEnd = false
      for (let i = offsetEnd; i < code.length; i++) {
        if (code[i] !== '\n') {
          offsetEnd = i + 1
          adaptedByEnd = true
          break
        }
      }
      if (!adaptedByEnd) {
        for (let i = offsetStart; i >= 0; i--) {
          if (code[i] !== '\n') {
            offsetStart = i
            break
          }
        }
      }
      start = textDocument.getPositionAt(offsetStart)
      end = textDocument.getPositionAt(offsetEnd)
    }
    return { start, end }
  }

  private fetchWorkspaceDiagnosticReport(ctx: RequestContext): Promise<lsp.WorkspaceDiagnosticReport> {
    const files = this.project.exportFiles()
    const cached = this.workspaceDiagnosticReportCache.get(files)
    if (cached != null) return cached
    const result = this.lspClient.workspaceDiagnostic(ctx, { previousResultIds: [] }).catch((err) => {
      this.workspaceDiagnosticReportCache.delete(files)
      throw err
    })
    this.workspaceDiagnosticReportCache.set(files, result)
    return result
  }

  async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = []
    // Use workspace/diagnostic instead of textDocument/diagnostic to maximize cache reuse
    const workspaceReport = await this.fetchWorkspaceDiagnosticReport({ signal: ctx.signal })
    const report = workspaceReport.items.find((item) => item.uri === ctx.textDocument.id.uri)
    if (report == null) return diagnostics
    if (report.kind !== lsp.DocumentDiagnosticReportKind.Full)
      throw new Error(`Report kind ${report.kind} not supported`)
    for (const item of report.items) {
      const diagnostic = fromLSPDiagnostic(item)
      const range = this.adaptLSDiagnosticRange(diagnostic.range, ctx.textDocument)
      diagnostics.push({ ...diagnostic, range })
    }
    return diagnostics
  }
}
