import type { TextDocumentIdentifier } from './common'

export type ExecutionLocation = {
  textDocument: TextDocumentIdentifier
  /** Line number, starting from 1. */
  line: number
}

/** Provides the current execution location as reactive state. */
export interface IExecutionLocationProvider {
  readonly location: ExecutionLocation | null
}
