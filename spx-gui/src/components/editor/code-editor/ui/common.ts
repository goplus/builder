import type * as monaco from 'monaco-editor'
import { Cancelled } from '@/utils/exception'
import type { ResourceModel } from '@/models/common/resource-model'
import { Sprite } from '@/models/sprite'
import { Sound } from '@/models/sound'
import { isWidget } from '@/models/widget'
import { type Range, type Position, type TextDocumentIdentifier, type Selection, positionEq } from '../common'
import type { Monaco } from '../monaco'

export function token2Signal(token: monaco.CancellationToken): AbortSignal {
  const ctrl = new AbortController()
  if (token.isCancellationRequested) ctrl.abort()
  else token.onCancellationRequested((e) => ctrl.abort(e ?? new Cancelled()))
  return ctrl.signal
}

export function fromMonacoPosition(position: monaco.IPosition): Position {
  return { line: position.lineNumber, column: position.column }
}

export function toMonacoPosition(position: Position): monaco.IPosition {
  return { lineNumber: position.line, column: position.column }
}

export function fromMonacoRange(range: monaco.IRange): Range {
  return {
    start: { line: range.startLineNumber, column: range.startColumn },
    end: { line: range.endLineNumber, column: range.endColumn }
  }
}

export function toMonacoRange(range: Range): monaco.IRange {
  return {
    startLineNumber: range.start.line,
    startColumn: range.start.column,
    endLineNumber: range.end.line,
    endColumn: range.end.column
  }
}

export function fromMonacoSelection(selection: monaco.ISelection): Selection {
  return {
    start: fromMonacoPosition({
      lineNumber: selection.selectionStartLineNumber,
      column: selection.selectionStartColumn
    }),
    position: fromMonacoPosition({
      lineNumber: selection.positionLineNumber,
      column: selection.positionColumn
    })
  }
}

export function toMonacoSelection(selection: Selection): monaco.ISelection {
  return {
    selectionStartLineNumber: selection.start.line,
    selectionStartColumn: selection.start.column,
    positionLineNumber: selection.position.line,
    positionColumn: selection.position.column
  }
}

export function fromMonacoUri(uri: monaco.Uri): TextDocumentIdentifier {
  // TODO: check if this is correct
  return { uri: uri.toString() }
}

export function toMonacoUri(id: TextDocumentIdentifier, monaco: Monaco): monaco.Uri {
  return monaco.Uri.parse(id.uri)
}

export function supportGoTo(resourceModel: ResourceModel): boolean {
  // Currently, we do not support "go to detail" for other types of resources due to two reasons:
  // 1. The "selected" state of certain resource types, such as animations, is still managed within the Component, making it difficult to control from here.
  // 2. The "selected" state of some resource types, like costumes and backdrops, affects game behavior.
  // TODO: Refactor to address issue 1 and reconsider user interactions to address issue 2, then enable this feature for all resource types.
  // Related issue: https://github.com/goplus/builder/issues/1139
  return resourceModel instanceof Sprite || resourceModel instanceof Sound || isWidget(resourceModel)
}
