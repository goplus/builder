import { onUnmounted, watchEffect } from 'vue'
import type * as monaco from 'monaco-editor'
import { Cancelled } from '@/utils/exception'
import { type Range, type Position, type TextDocumentIdentifier, type Selection } from '../common'
import type { Monaco, MonacoEditor } from '../monaco'
import { useCodeEditorUICtx } from './CodeEditorUI.vue'

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
  return { uri: uri.toString() }
}

export function toMonacoUri(id: TextDocumentIdentifier, monaco: Monaco): monaco.Uri {
  return monaco.Uri.parse(id.uri)
}

/** Position in pixels relative to the viewport's top-left corner */
export type AbsolutePosition = {
  top: number
  left: number
  height: number
}

/**
 * Convert a position in the editor to an absolute position in the viewport.
 * **Known issue:**
 * If there's a decoration start from given position, `toAbsolutePosition` now returns the absolute position of the decoration
 * instead of the absolute position of the exact column, which is rendered after the decoration.
 * This is not ideal for most cases. TODO: get accurate position.
 */
export function toAbsolutePosition(position: Position, editor: MonacoEditor): AbsolutePosition | null {
  const mPos = toMonacoPosition(position)
  const editorPos = editor.getDomNode()?.getBoundingClientRect()
  if (editorPos == null) return null
  const scrolledVisiblePos = editor.getScrolledVisiblePosition(mPos)
  if (scrolledVisiblePos == null) return null
  return {
    top: editorPos.top + scrolledVisiblePos.top,
    left: editorPos.left + scrolledVisiblePos.left,
    height: scrolledVisiblePos.height
  }
}

export function useDecorations(
  /** Returns decorations to be rendered in the editor. */
  getDecorations: () => monaco.editor.IModelDeltaDecoration[]
) {
  const codeEditorUICtx = useCodeEditorUICtx()
  let collection: monaco.editor.IEditorDecorationsCollection | null = null

  watchEffect(() => {
    const decorations = getDecorations()
    if (decorations.length === 0) {
      collection?.clear()
      return
    }

    collection = collection ?? codeEditorUICtx.ui.editor.createDecorationsCollection([])
    collection.set(decorations)
  })
  onUnmounted(() => collection?.clear())
}
