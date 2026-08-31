import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import type { CodeEditor } from '../code-editor'
import type { Position, Range, TextDocumentIdentifier } from '../common'
import type { TextDocument } from '../text-document'
import type { Monaco, monaco } from '../monaco'
import { DefinitionPeekController } from './definition-peek'
import { builtInCommandRename, builtInCommandViewReferences } from './code-editor-ui'

const definitionRange: Range = { start: { line: 1, column: 6 }, end: { line: 1, column: 15 } }

function makeDocument(uri: string, code: string) {
  let counter = 0
  let version = 1
  const decorations = new Map<string, monaco.IRange>()
  const listeners = new Set<(event: monaco.editor.IModelContentChangedEvent) => void>()
  const getOffsetAt = (position: Position) =>
    code
      .split('\n')
      .slice(0, position.line - 1)
      .reduce((sum, line) => sum + line.length + 1, 0) +
    position.column -
    1
  const getPositionAt = (offset: number) => {
    const lines = code.slice(0, offset).split('\n')
    return { line: lines.length, column: lines[lines.length - 1].length + 1 }
  }
  const model = {
    getVersionId: () => version,
    deltaDecorations: vi.fn((old: string[], added: { range: monaco.IRange }[]) => {
      old.forEach((id) => decorations.delete(id))
      return added.map((item) => {
        const id = String(++counter)
        decorations.set(id, item.range)
        return id
      })
    }),
    getDecorationRange: (id: string) => decorations.get(id),
    onDidChangeContent: (callback: (event: monaco.editor.IModelContentChangedEvent) => void) => {
      listeners.add(callback)
      return { dispose: () => listeners.delete(callback) }
    },
    getValue: () => code
  }
  const textDocument = {
    id: { uri },
    displayName: { en: uri, zh: uri },
    monacoTextModel: model,
    getValue: () => code,
    getOffsetAt,
    getPositionAt,
    getValueInRange: (range: Range) => code.slice(getOffsetAt(range.start), getOffsetAt(range.end)),
    getLineContent: (line: number) => code.split('\n')[line - 1]
  } as unknown as TextDocument
  return {
    textDocument,
    model,
    decorations,
    replaceSameLength(before: string, after: string, isFlush = false) {
      expect(after.length).toBe(before.length)
      const rangeOffset = code.indexOf(before)
      code = code.replace(before, after)
      const event = {
        versionId: ++version,
        isFlush,
        isUndoing: false,
        isRedoing: false,
        changes: [{ rangeOffset, rangeLength: before.length, text: after }]
      } as monaco.editor.IModelContentChangedEvent
      ;[...listeners].forEach((callback) => callback(event))
    },
    insertLine() {
      code = '\n' + code
      for (const [id, range] of decorations)
        decorations.set(id, {
          ...range,
          startLineNumber: range.startLineNumber + 1,
          endLineNumber: range.endLineNumber + 1
        })
      listeners.forEach((callback) =>
        callback({
          changes: [],
          isFlush: false,
          isUndoing: false,
          isRedoing: false
        } as unknown as monaco.editor.IModelContentChangedEvent)
      )
    }
  }
}

function location(uri: string, line: number, character = 0) {
  return { uri, range: { start: { line, character }, end: { line, character: character + 9 } } }
}

function setup() {
  const stage = makeDocument('file:///main.spx', 'func factorial(n int) int {\n return factorial(n - 1)\n}')
  const board = makeDocument('file:///Board.spx', 'factorial(5)\nfactorial(3)')
  const files = shallowRef({})
  const provideHover = vi.fn().mockResolvedValue(null)
  const references = vi
    .fn()
    .mockResolvedValue([
      location(stage.textDocument.id.uri, 1, 8),
      location(board.textDocument.id.uri, 1),
      location(board.textDocument.id.uri, 0),
      location(board.textDocument.id.uri, 0)
    ])
  const codeEditor = {
    monaco: { editor: { TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 } } } as unknown as Monaco,
    project: { exportFiles: () => files.value, getCodeFiles: () => ['main.spx', 'Board.spx'] },
    functionChangeReview: null,
    isApplyingWorkspaceEdit: false,
    setFunctionChangeReview: vi.fn((review) => Object.assign(codeEditor, { functionChangeReview: review })),
    lspClient: { textDocumentReferences: references },
    hoverProvider: { provideHover },
    getTextDocument: (id: TextDocumentIdentifier) =>
      [stage, board].find((doc) => doc.textDocument.id.uri === id.uri)?.textDocument ?? null
  } as unknown as CodeEditor
  const controller = new DefinitionPeekController(codeEditor, stage.textDocument, definitionRange)
  return { controller, references, stage, board, files, provideHover, codeEditor }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('DefinitionPeekController', () => {
  it('starts review from a parameter type edit and preserves original references when lookup becomes empty', async () => {
    const { controller, stage, codeEditor, references } = setup()
    await controller.loadReferences()
    stage.replaceSameLength('n int', 'n any')
    expect(codeEditor.functionChangeReview?.calls).toHaveLength(3)
    expect(controller.review).toBe(codeEditor.functionChangeReview)
    references.mockResolvedValue([])
    await controller.loadReferences()
    expect(controller.references).toHaveLength(3)
    controller.dispose()
    expect(codeEditor.functionChangeReview?.calls).toHaveLength(3)
    codeEditor.functionChangeReview?.dispose()
  })

  it('does not start a parameter review for body edits or semantic rename operations', async () => {
    const { controller, stage, codeEditor } = setup()
    await controller.loadReferences()
    stage.replaceSameLength('n - 1', 'n - 2')
    expect(codeEditor.functionChangeReview).toBeNull()
    Object.assign(codeEditor, { isApplyingWorkspaceEdit: true })
    stage.replaceSameLength('n int', 'x int')
    expect(codeEditor.functionChangeReview).toBeNull()
    Object.assign(codeEditor, { isApplyingWorkspaceEdit: false })
    stage.replaceSameLength('x int', 'n int', true)
    expect(codeEditor.functionChangeReview).toBeNull()
    controller.dispose()
  })

  it('offers the existing semantic rename action for the hovered Peek document, without nested navigation', async () => {
    const { controller, stage, provideHover } = setup()
    const position = definitionRange.start
    const rename = {
      command: builtInCommandRename,
      arguments: [{ textDocument: stage.textDocument.id, position, range: definitionRange }]
    }
    const hover = {
      contents: [],
      range: definitionRange,
      actions: [{ command: builtInCommandViewReferences, arguments: [] }, rename]
    }
    provideHover.mockResolvedValue(hover)
    const ctx = { textDocument: stage.textDocument, signal: new AbortController().signal }
    expect(await controller.provideHover(ctx, position)).toEqual({ ...hover, actions: [rename] })
    expect(provideHover).toHaveBeenCalledWith(ctx, position)
    expect(hover.actions).toHaveLength(2)
    controller.dispose()
  })

  it('does not offer rename for symbols the language service cannot rename', async () => {
    const { controller, stage, provideHover } = setup()
    const ctx = { textDocument: stage.textDocument, signal: new AbortController().signal }
    expect(await controller.provideHover(ctx, definitionRange.start)).toBeNull()
    provideHover.mockResolvedValue({ contents: [], actions: [] })
    expect(await controller.provideHover(ctx, definitionRange.start)).toBeNull()
    controller.dispose()
  })

  it('queries all project references excluding the declaration, sorts and deduplicates without removing recursion', async () => {
    const { controller, references } = setup()
    await controller.loadReferences()
    expect(references).toHaveBeenCalledWith(
      { signal: expect.any(AbortSignal) },
      {
        textDocument: { uri: 'file:///main.spx' },
        position: { line: 0, character: 5 },
        context: { includeDeclaration: false }
      }
    )
    expect(controller.references?.map((r) => [r.textDocument.id.uri, r.range.start.line])).toEqual([
      ['file:///Board.spx', 1],
      ['file:///Board.spx', 2],
      ['file:///main.spx', 2]
    ])
    controller.dispose()
  })

  it('switches references and returns to the same definition model without replacing code', async () => {
    const { controller, board, stage } = setup()
    await controller.loadReferences()
    controller.showReference(controller.references![0])
    expect(controller.current.textDocument.monacoTextModel).toBe(board.model)
    controller.showDefinition()
    expect(controller.current.textDocument.monacoTextModel).toBe(stage.model)
    controller.dispose()
    expect(stage.decorations.size).toBe(0)
    expect(board.decorations.size).toBe(0)
  })

  it('tracks the definition after inserting lines, and queries its updated position', async () => {
    const { controller, stage, references } = setup()
    stage.insertLine()
    expect(controller.current.range.start.line).toBe(2)
    await controller.loadReferences()
    expect(references.mock.calls[0][1].position).toEqual({ line: 1, character: 5 })
    controller.dispose()
  })

  it('distinguishes no references from failure and supports retry without losing the definition', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { controller, references } = setup()
    references.mockRejectedValueOnce(new Error('offline'))
    await controller.loadReferences()
    expect(controller.failed).toBe(true)
    expect(controller.references).toBeNull()
    expect(controller.current).toBe(controller.definition)
    references.mockResolvedValueOnce(null)
    await controller.loadReferences()
    expect(controller.failed).toBe(false)
    expect(controller.references).toEqual([])
    controller.dispose()
  })

  it('ignores outdated results and results delivered after closing peek', async () => {
    const { controller, references } = setup()
    let finish: (value: unknown) => void = () => {}
    references.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const old = controller.loadReferences()
    references.mockResolvedValueOnce([])
    await controller.loadReferences()
    finish([location('file:///Board.spx', 0)])
    await old
    expect(controller.references).toEqual([])
    references.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const closing = controller.loadReferences()
    controller.dispose()
    finish([location('file:///Board.spx', 0)])
    await closing
    expect(controller.references).toEqual([])
  })

  it('refreshes after project edits and prevents selecting stale positions while updating', async () => {
    vi.useFakeTimers()
    const { controller, files, references } = setup()
    await controller.loadReferences()
    const beforeEdit = controller.references![0]
    files.value = { changed: true }
    await nextTick()
    expect(controller.loading).toBe(true)
    controller.showReference(beforeEdit)
    expect(controller.current).toBe(controller.definition)
    await vi.advanceTimersByTimeAsync(300)
    expect(references).toHaveBeenCalledTimes(2)
    expect(controller.loading).toBe(false)
    controller.dispose()
  })
})
