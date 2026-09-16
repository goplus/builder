import { describe, expect, it, vi } from 'vitest'
import type { CodeEditor } from '../code-editor'
import type { Position, Range, TextDocumentIdentifier, TextEdit } from '../common'
import type { TextDocument } from '../text-document'
import type { Monaco, monaco } from '../monaco'
import { FunctionChangeReview } from './function-change-review'
import { PeekLocation } from './peek-location'

function makeDocument(uri: string, initial: string) {
  let code = initial
  let version = 1
  let id = 0
  const anchors = new Map<string, { start: number; end: number }>()
  const listeners = new Set<(event: monaco.editor.IModelContentChangedEvent) => void>()
  const offset = (position: Position) =>
    code
      .split('\n')
      .slice(0, position.line - 1)
      .reduce((n, line) => n + line.length + 1, 0) +
    position.column -
    1
  const position = (value: number) => {
    const lines = code.slice(0, value).split('\n')
    return { line: lines.length, column: lines[lines.length - 1].length + 1 }
  }
  function edit(start: number, length: number, text: string) {
    const end = start + length
    const delta = text.length - length
    for (const anchor of anchors.values()) {
      anchor.start = anchor.start <= start ? anchor.start : anchor.start >= end ? anchor.start + delta : start
      anchor.end = anchor.end < start ? anchor.end : anchor.end > end ? anchor.end + delta : start + text.length
    }
    code = code.slice(0, start) + text + code.slice(end)
    const event = {
      versionId: ++version,
      changes: [{ rangeOffset: start, rangeLength: length, text }]
    } as monaco.editor.IModelContentChangedEvent
    ;[...listeners].forEach((listener) => listener(event))
  }
  const model = {
    getVersionId: () => version,
    getValue: () => code,
    deltaDecorations(old: string[], additions: { range: monaco.IRange }[]) {
      old.forEach((key) => anchors.delete(key))
      return additions.map(({ range }) => {
        const key = String(++id)
        anchors.set(key, {
          start: offset({ line: range.startLineNumber, column: range.startColumn }),
          end: offset({ line: range.endLineNumber, column: range.endColumn })
        })
        return key
      })
    },
    getDecorationRange(key: string) {
      const anchor = anchors.get(key)
      if (anchor == null) return null
      const start = position(anchor.start),
        end = position(anchor.end)
      return { startLineNumber: start.line, startColumn: start.column, endLineNumber: end.line, endColumn: end.column }
    },
    onDidChangeContent(listener: (event: monaco.editor.IModelContentChangedEvent) => void) {
      listeners.add(listener)
      return { dispose: () => listeners.delete(listener) }
    }
  }
  const document = {
    id: { uri },
    monacoTextModel: model,
    getValue: () => code,
    setValue: (value: string) => edit(0, code.length, value),
    pushEdits(edits: TextEdit[]) {
      edits
        .map((item) => ({ start: offset(item.range.start), end: offset(item.range.end), text: item.newText }))
        .sort((a, b) => b.start - a.start)
        .forEach((item) => edit(item.start, item.end - item.start, item.text))
    },
    getOffsetAt: offset,
    getPositionAt: position,
    getValueInRange: (range: Range) => code.slice(offset(range.start), offset(range.end)),
    getLineContent: (line: number) => code.split('\n')[line - 1]
  } as unknown as TextDocument
  return {
    document,
    edit,
    anchors,
    replace(before: string, after: string) {
      edit(code.indexOf(before), before.length, after)
    }
  }
}

function setup(incomplete = false) {
  const original = 'func sum(x int) int {\n return sum(x - 1)\n}\n// unrelated'
  const stage = makeDocument('file:///main.spx', original.replace('(x int)', '(x int, y int)'))
  const board = makeDocument('file:///Board.spx', 'sum(5)\nsum(3)\n// other code')
  const other = makeDocument('file:///Other.spx', 'println 1')
  const documents = [stage, board, other]
  const monaco = {
    editor: { TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1, AlwaysGrowsWhenTypingAtEdges: 0 } }
  } as unknown as Monaco
  const setReview = vi.fn()
  const history = { doAction: vi.fn(async (_action, fn) => fn()) }
  const editor = {
    monaco,
    history,
    project: { getCodeFiles: () => ['main.spx', 'Board.spx', 'Other.spx'] },
    getTextDocument: (id: TextDocumentIdentifier) =>
      documents.find((doc) => doc.document.id.uri === id.uri)?.document ?? null,
    setFunctionChangeReview: setReview
  } as unknown as CodeEditor
  const definition = new PeekLocation(
    stage.document,
    { start: { line: 1, column: 6 }, end: { line: 1, column: 9 } },
    monaco
  )
  const parameters = new PeekLocation(
    stage.document,
    { start: { line: 1, column: 9 }, end: { line: 1, column: 23 } },
    monaco,
    true
  )
  const refs = [
    {
      textDocument: board.document,
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } },
      code: 'sum(5)'
    },
    {
      textDocument: board.document,
      range: { start: { line: 2, column: 1 }, end: { line: 2, column: 4 } },
      code: 'sum(3)'
    },
    {
      textDocument: stage.document,
      range: { start: { line: 2, column: 9 }, end: { line: 2, column: 12 } },
      code: 'return sum(x - 1)'
    }
  ]
  const review = new FunctionChangeReview(editor, definition, parameters, incomplete ? null : refs, original)
  setReview.mockImplementation(() => review.dispose())
  const dispose = () => {
    review.dispose()
    definition.dispose()
    parameters.dispose()
  }
  return { review, stage, board, other, history, original, setReview, refs, dispose }
}

describe('FunctionChangeReview', () => {
  it('retains all original calls including recursion even when new lookup returns no results', () => {
    const { review, refs, dispose } = setup()
    review.mergeReferences([])
    review.mergeReferences(refs)
    expect(review.calls).toHaveLength(3)
    expect(review.remaining).toHaveLength(3)
    expect(review.canComplete).toBe(false)
    review.calls.forEach((call) => review.markChecked(call))
    expect(review.canComplete).toBe(true)
    dispose()
  })

  it('requires rechecking only the edited call, and all calls after another parameter change', () => {
    const { review, stage, board, dispose } = setup()
    review.calls.forEach((call) => review.markChecked(call))
    board.replace('sum(5)', 'sum(5, 1)')
    expect(review.remaining.map((call) => call.id)).toEqual([1])
    expect(review.canUndo).toBe(true)
    stage.replace('y int', 'y float64')
    expect(review.remaining).toHaveLength(3)
    expect(review.canUndo).toBe(true)
    dispose()
  })

  it('undoes parameter and multi-document call edits as one reversible project action, preserving other files', async () => {
    const { review, stage, board, other, history, original, setReview, dispose } = setup()
    board.replace('sum(5)', 'sum(5, 1)')
    stage.replace('sum(x - 1)', 'sum(x - 1, y)')
    other.replace('println 1', 'println 2')
    await review.undo()
    expect(stage.document.getValue()).toBe(original)
    expect(board.document.getValue()).toBe('sum(5)\nsum(3)\n// other code')
    expect(other.document.getValue()).toBe('println 2')
    expect(history.doAction).toHaveBeenCalledTimes(1)
    expect(setReview).toHaveBeenCalledWith(null)
    dispose()
  })

  it('refuses bulk undo when other code in an involved document was edited', async () => {
    const { review, board, history, dispose } = setup()
    board.replace('// other code', '// keep this change')
    expect(review.hasConflictingEdits).toBe(true)
    expect(review.canUndo).toBe(false)
    await review.undo()
    expect(history.doAction).not.toHaveBeenCalled()
    expect(board.document.getValue()).toContain('keep this change')
    dispose()
  })

  it('does not mark an incomplete parameter list or missing original references as fully reviewed', () => {
    const { review, stage, dispose } = setup()
    review.calls.forEach((call) => review.markChecked(call))
    stage.replace('(x int, y int)', '(x int, y int')
    expect(review.parametersComplete).toBe(false)
    expect(review.canComplete).toBe(false)
    dispose()
    const missing = setup(true)
    expect(missing.review.referencesIncomplete).toBe(true)
    expect(missing.review.canComplete).toBe(false)
    missing.dispose()
  })

  it('finishes review without changing code or adding a save action', () => {
    const { review, stage, history, setReview, dispose } = setup()
    review.calls.forEach((call) => review.markChecked(call))
    const code = stage.document.getValue()
    review.complete()
    expect(setReview).toHaveBeenCalledWith(null)
    expect(stage.document.getValue()).toBe(code)
    expect(history.doAction).not.toHaveBeenCalled()
    dispose()
  })
})
