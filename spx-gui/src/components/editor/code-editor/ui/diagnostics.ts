import type Emitter from '@/utils/emitter'
import { type BaseContext, type IRange } from '../common'

export type DiagnosticsContext = BaseContext

export enum DiagnosticSeverity {
  Error,
  Warning
}

export type Diagnostic = {
  range: IRange
  severity: DiagnosticSeverity
  message: string
}

export interface IDiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: []
  }> {
  provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]>
}
