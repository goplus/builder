import type Emitter from '@/utils/emitter'
import { type BaseContext, type Diagnostic } from '../common'

export type DiagnosticsContext = BaseContext

export interface IDiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: []
  }> {
  provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]>
}
