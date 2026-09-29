import Emitter from '@/utils/emitter'
import type { TextDocumentIdentifier } from './common'

export type ExecutionLocation = {
  textDocument: TextDocumentIdentifier
  /** Line number, starting from 1. */
  line: number
}

/** Provides the current execution location and reports when it changes. */
export interface IExecutionLocationProvider extends Emitter<{ didChangeExecutionLocation: void }> {
  provideExecutionLocation(): ExecutionLocation | null
}
