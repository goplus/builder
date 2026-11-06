import Emitter from '@/utils/emitter'
import type { TextDocumentIdentifier } from './common'

export type ExecutionLocation = {
  textDocument: TextDocumentIdentifier
  /** Line number, starting from 1. */
  line: number
}

/** Provides active execution locations and reports when they change. */
export interface IExecutionLocationProvider extends Emitter<{ didChangeExecutionLocations: void }> {
  provideExecutionLocations(): readonly ExecutionLocation[]
}
