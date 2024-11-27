import * as monaco from 'monaco-editor'
import type { IRange, Position, TextDocumentIdentifier } from '../common'

export function token2Signal(token: monaco.CancellationToken): AbortSignal {
  const ctrl = new AbortController()
  if (token.isCancellationRequested) ctrl.abort()
  else token.onCancellationRequested((e) => ctrl.abort(e))
  return ctrl.signal
}

export function fromMonacoPosition(position: monaco.IPosition): Position {
  return { line: position.lineNumber, column: position.column }
}

export function toMonacoPosition(position: Position): monaco.IPosition {
  return { lineNumber: position.line, column: position.column }
}

export function fromMonacoRange(range: monaco.IRange): IRange {
  return {
    start: { line: range.startLineNumber, column: range.startColumn },
    end: { line: range.endLineNumber, column: range.endColumn }
  }
}

export function toMonacoRange(range: IRange): monaco.IRange {
  return {
    startLineNumber: range.start.line,
    startColumn: range.start.column,
    endLineNumber: range.end.line,
    endColumn: range.end.column
  }
}

export function fromMonacoTextModelUri(uri: monaco.Uri): TextDocumentIdentifier {
  // TODO: check if this is correct
  return { uri: uri.toString() }
}
