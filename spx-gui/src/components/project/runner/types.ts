import type { TextDocumentIdentifier, TextDocumentRange } from '@/components/xgo-code-editor'

export type ProjectRunnerOutput = {
  kind: 'log' | 'error'
  time: number
  message: string
  source: TextDocumentRange
}

export type ProjectRunnerLocation = {
  textDocument: TextDocumentIdentifier
  /** Line number, starting from 1. */
  line: number
}
