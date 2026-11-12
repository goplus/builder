import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { fromText, type Files } from '@/models/common/file'
import { DiagnosticSeverity, type Diagnostic, type Position } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'
import { DiagnosticsController } from '.'

const controllers: DiagnosticsController[] = []
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose())
  vi.useRealTimers()
})

function problem(message = 'Missing argument', line = 2, origin: Diagnostic['origin'] | null = 'static'): Diagnostic {
  return {
    message,
    severity: DiagnosticSeverity.Error,
    range: { start: { line, column: 2 }, end: { line, column: 6 } },
    ...(origin == null ? {} : { origin })
  }
}

function positionAt(source: string, offset: number): Position {
  const lines = source.slice(0, offset).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

function problemAt(source: string, target: string, message: string, options: Partial<Diagnostic> = {}): Diagnostic {
  const offset = source.indexOf(target)
  if (offset < 0) throw new Error(`Missing fixture target: ${target}`)
  const range = { start: positionAt(source, offset), end: positionAt(source, offset + target.length) }
  return { ...problem(message), range, sourceRange: range, ...options }
}

function problemAtOffset(source: string, offset: number, message: string, length = 1): Diagnostic {
  const range = { start: positionAt(source, offset), end: positionAt(source, offset + length) }
  return { ...problem(message), range, sourceRange: range }
}

function setup(simpleMode = true, initialDiagnostics: Diagnostic[] = [], initialSource = 'onStart {\n\tstep 10\n}\n') {
  let source = initialSource
  let ownerSource = source
  let version = 1
  let focused = true
  let selectionCount = 1
  let cursor: Position | null = { line: 2, column: 6 }
  let pinnedCursor = false
  const files = shallowRef<Files>({
    'Lita.spx': fromText('Lita.spx', source),
    'helpers.spx': fromText('helpers.spx', 'var distance = 10')
  })
  const diagnostics = shallowRef(initialDiagnostics)
  const listeners = new Map<string, (event?: any) => void>()
  const event = (name: string) => (listener: (value: any) => void) => {
    listeners.set(name, listener)
    return { dispose: () => listeners.delete(name) }
  }
  const model = { getVersionId: () => version }
  const document = () => ({ id: { uri: 'file:///Lita.spx' }, getValue: () => source, monacoTextModel: model })
  const activeDocument = shallowRef(document())
  const provideDiagnostics = vi.fn(async () => diagnostics.value)
  const provider = shallowRef({ provideDiagnostics, on: () => () => {} })
  const ui = {
    simpleMode,
    get activeTextDocument() {
      return activeDocument.value
    },
    project: {
      exportFiles: () => files.value,
      getCodeOwner: (path: string) => (path === 'Lita.spx' ? { getCode: () => ownerSource } : null)
    },
    codeEditor: {
      get diagnosticsProvider() {
        return provider.value
      }
    },
    editor: {
      getValue: () => source,
      getModel: () => model,
      getPosition: () => (cursor == null ? null : { lineNumber: cursor.line, column: cursor.column }),
      hasTextFocus: () => focused,
      getSelections: () => Array.from({ length: selectionCount }, () => ({})),
      onDidChangeModel: event('model'),
      onDidChangeModelContent: event('content'),
      onDidChangeCursorPosition: event('cursor'),
      onDidBlurEditorWidget: event('blur'),
      onDidPaste: event('paste'),
      onDidCompositionStart: event('compositionStart'),
      onDidCompositionEnd: event('compositionEnd')
    }
  } as unknown as CodeEditorUIController
  const controller = new DiagnosticsController(ui)
  controllers.push(controller)
  controller.init()
  async function settle() {
    await nextTick()
    await vi.advanceTimersByTimeAsync(110)
    await nextTick()
  }
  function emit(name: string, value?: any) {
    if (name === 'cursor') {
      cursor = { line: value.position.lineNumber, column: value.position.column }
      pinnedCursor = true
    }
    listeners.get(name)?.(value)
  }
  function edit(nextSource = 'onStart {\n\tstep\n}\n', overrides: Record<string, unknown> = {}) {
    const previous = source
    let start = 0
    while (start < previous.length && start < nextSource.length && previous[start] === nextSource[start]) start++
    let end = previous.length
    let nextEnd = nextSource.length
    while (end > start && nextEnd > start && previous[end - 1] === nextSource[nextEnd - 1]) {
      end--
      nextEnd--
    }
    const text = nextSource.slice(start, nextEnd)
    source = nextSource
    ownerSource = nextSource
    version++
    files.value = { ...files.value, 'Lita.spx': fromText('Lita.spx', source) }
    if (!pinnedCursor) cursor = positionAt(source, start + text.length)
    const rangeStart = positionAt(previous, start)
    const rangeEnd = positionAt(previous, end)
    emit('content', {
      versionId: version,
      isFlush: false,
      isUndoing: false,
      isRedoing: false,
      changes: [
        {
          range: {
            startLineNumber: rangeStart.line,
            startColumn: rangeStart.column,
            endLineNumber: rangeEnd.line,
            endColumn: rangeEnd.column
          },
          rangeOffset: start,
          rangeLength: end - start,
          text
        }
      ],
      ...overrides
    })
  }
  function switchDocument() {
    source = 'onStart {\n\tturn\n}\n'
    ownerSource = source
    version = 1
    activeDocument.value = document()
    files.value = { ...files.value, 'Lita.spx': fromText('Lita.spx', source) }
    emit('model')
  }
  return {
    controller,
    diagnostics,
    provideDiagnostics,
    settle,
    edit,
    emit,
    switchDocument,
    setFocused: (value: boolean) => {
      focused = value
    },
    setSelectionCount: (value: number) => {
      selectionCount = value
    },
    setOwnerSource: (value: string) => {
      ownerSource = value
    },
    setCursorLine: (value: number | null) => {
      cursor = value == null ? null : { line: value, column: 6 }
      pinnedCursor = true
    },
    setCursor: (value: Position | null) => {
      cursor = value
      pinnedCursor = true
    },
    changeOtherFile: () => {
      files.value = { ...files.value, 'helpers.spx': fromText('helpers.spx', 'var distance = "changed"') }
    },
    replaceProvider: (result: Diagnostic[]) => {
      const replacement = vi.fn(async () => result)
      provider.value = { provideDiagnostics: replacement, on: () => () => {} }
      return replacement
    }
  }
}

describe('Simple Mode diagnostic feedback', () => {
  it('keeps a newly typed call deferred as its callee grows and required arguments are entered', async () => {
    const source = 'func four(a, b, c, d float64) {}\nonStart {\n\t\n}\n'
    const test = setup(true, [], source)
    await test.settle()
    let lastDiagnostic!: Diagnostic
    for (const text of ['f', 'fo', 'fou', 'four', 'four 1', 'four 1,2', 'four 1,2,3']) {
      const edited = source.replace('\t\n', `\t${text}\n`)
      const offset = edited.indexOf('\n\t') + 2
      lastDiagnostic = problemAtOffset(
        edited,
        offset,
        text.length < 4 ? `undefined: ${text}` : 'not enough arguments in call to four',
        Math.min(text.length, 4)
      )
      test.diagnostics.value = [lastDiagnostic]
      test.edit(edited)
      await test.settle()
      expect(test.controller.diagnostics, `typing ${text}`).toEqual([])
    }
    test.emit('cursor', { position: { lineNumber: 4, column: 2 } })
    expect(test.controller.diagnostics).toEqual([lastDiagnostic])
    test.diagnostics.value = []
    test.edit(source.replace('\t\n', '\tfour 1,2,3,4\n'))
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
  })

  it('maps an accepted report through a later newline edit before the next check finishes', async () => {
    const source = 'onStart {\n\tglide 100,50,1\n\tprintln unknownName\n}\n'
    const longer = source.replace('50', '"a long string"')
    const multiline = longer.replace('100,', '100,\n\t\t')
    const baseline = problemAt(source, 'unknownName', 'undefined: unknownName')
    const local = problemAt(longer, '"a long string"', 'cannot use string as float64')
    const independent = problemAt(longer, 'unknownName', 'undefined: unknownName')
    const runtime = problemAt(longer, 'glide', 'previous execution failed', { origin: 'runtime' })
    const test = setup(true, [baseline], source)
    await test.settle()
    test.diagnostics.value = [local, independent, runtime]
    test.edit(longer)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([independent, runtime])

    let finish!: (value: Diagnostic[]) => void
    test.provideDiagnostics.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    test.edit(multiline)
    const mappedLocal = problemAt(multiline, '"a long string"', 'cannot use string as float64')
    const mappedIndependent = problemAt(multiline, 'unknownName', 'undefined: unknownName')
    expect(test.provideDiagnostics).toHaveBeenCalledTimes(2)
    expect(test.controller.diagnostics).toEqual([mappedIndependent])
    expect(test.controller.diagnostics?.[0].range.start.line).toBe(4)

    test.controller.reveal()
    expect(test.controller.diagnostics).toEqual([mappedLocal, mappedIndependent])
    expect(test.controller.diagnostics?.map((item) => item.range.start.line)).toEqual([3, 4])
    finish([mappedLocal, mappedIndependent])
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(test.controller.diagnostics).toEqual([mappedLocal, mappedIndependent])
  })

  it('defers an empty middle argument of a four-parameter custom call without changing its declaration', async () => {
    const source = 'func travel(a, b, c, d float64) {}\nonStart {\n\ttravel 100, 1, 90, 2\n}\n'
    const offset = source.indexOf('90')
    const edited = source.slice(0, offset) + source.slice(offset + 2)
    const diagnostic = problemAtOffset(edited, offset, "expected operand, found ','")
    const test = setup(true, [], source)
    await test.settle()
    test.diagnostics.value = [diagnostic]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    expect(test.provideDiagnostics).toHaveBeenCalledTimes(2)
    test.emit('cursor', { position: { lineNumber: 4, column: 2 } })
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it('defers a missing last required argument after editing a custom function call', async () => {
    const source = 'func travel(a, b, c, d float64) {}\nonStart {\n\ttravel 100, 1, 90, 2\n}\n'
    const edited = source.replace('90, 2', '90')
    const diagnostic = problemAt(edited, 'travel 100', 'not enough arguments in call to travel')
    const test = setup(true, [], source)
    await test.settle()
    test.diagnostics.value = [diagnostic]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.controller.reveal()
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it.each([
    ['100', ',50,1'],
    ['50', '100,,1'],
    ['1', '100,50,']
  ])('handles an empty %s argument in a three-argument glide call', async (removed, arguments_) => {
    const source = 'onStart {\n\tglide 100,50,1\n}\n'
    const edited = `onStart {\n\tglide ${arguments_}\n}\n`
    const offset = removed === '1' ? edited.indexOf('\n', edited.indexOf('glide')) : edited.indexOf(',,') + 1
    const diagnostic = problemAtOffset(
      edited,
      removed === '100' ? edited.indexOf(',50') : offset,
      removed === '1' ? "expected operand, found '}'" : "expected operand, found ','",
      removed === '1' ? 0 : 1
    )
    const test = setup(true, [], source)
    await test.settle()
    test.diagnostics.value = [diagnostic]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it.each([
    ['bare', 'onStart {\n\tglide 100,\n\t\t50,\n\t\t1\n}\n', 2, 4, 5],
    ['parenthesized', 'onStart {\n\tglide(\n\t\t100,\n\t\t50,\n\t\t1,\n\t)\n}\n', 3, 5, 7]
  ] as const)(
    'keeps a %s multiline call deferred while the cursor moves between its argument lines',
    async (_, source, firstLine, lastLine, outsideLine) => {
      const offset = source.indexOf('50')
      const edited = source.slice(0, offset) + source.slice(offset + 2)
      const diagnostic = problemAtOffset(edited, offset, "expected operand, found ','")
      const test = setup(true, [], source)
      await test.settle()
      test.diagnostics.value = [diagnostic]
      test.edit(edited)
      await test.settle()
      expect(test.controller.diagnostics).toEqual([])
      test.emit('cursor', { position: { lineNumber: firstLine, column: 4 } })
      expect(test.controller.diagnostics).toEqual([])
      test.emit('cursor', { position: { lineNumber: lastLine, column: 4 } })
      expect(test.controller.diagnostics).toEqual([])
      test.emit('cursor', { position: { lineNumber: outsideLine, column: 2 } })
      expect(test.controller.diagnostics).toEqual([diagnostic])
    }
  )

  it('tracks a legitimate newline inserted between arguments instead of treating it as leaving the statement', async () => {
    const source = 'onStart {\n\tglide 100,50,1\n}\n'
    const multiline = source.replace('100,50', '100,\n\t\t50')
    const test = setup(true, [], source)
    await test.settle()
    test.edit(multiline)
    await test.settle()
    const edited = multiline.replace('50', '')
    const diagnostic = problemAtOffset(edited, multiline.indexOf('50'), "expected operand, found ','")
    test.diagnostics.value = [diagnostic]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('cursor', { position: { lineNumber: 2, column: 10 } })
    expect(test.controller.diagnostics).toEqual([])
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it('defers bounded parser cascades and preserves an omitted independent error during editing and after leave', async () => {
    const source = 'onStart {\n\tglide 100,50,1\n\tprintln unknownName\n\tprintln freshName\n}\nprintln afterBlock\n'
    const offset = source.indexOf('50')
    const edited = source.slice(0, offset) + source.slice(offset + 2)
    const baseline = problemAt(source, 'unknownName', 'undefined: unknownName')
    const anchor = problemAtOffset(edited, offset, "expected operand, found ','")
    const cascade = problemAt(edited, 'println freshName', "expected ';', found println")
    const closing = problemAt(edited, '}', "expected operand, found '}'")
    const semantic = problemAt(edited, 'freshName', 'cannot use freshName as int')
    const outside = problemAt(edited, 'afterBlock', "expected statement, found 'IDENT'")
    const independent = problemAt(edited, 'unknownName', 'undefined: unknownName')
    const test = setup(true, [baseline], source)
    await test.settle()
    test.diagnostics.value = [anchor, cascade, closing, semantic, outside]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([semantic, outside, independent])
    test.emit('cursor', { position: { lineNumber: 4, column: 5 } })
    expect(test.controller.diagnostics).toEqual([anchor, cascade, closing, semantic, outside, independent])
    await test.settle()
    expect(test.controller.diagnostics).toEqual([anchor, cascade, closing, semantic, outside, independent])
  })

  it('uses the original source range for a zero-width local error whose rendered range extends to the next statement', async () => {
    const source = 'onStart {\n\tglide 100,50,1\n\tprintln "done"\n}\n'
    const edited = source.replace('50', '')
    const offset = source.indexOf('50')
    const diagnostic = {
      ...problemAt(edited, 'println', "expected operand, found ','"),
      sourceRange: { start: positionAt(edited, offset), end: positionAt(edited, offset) }
    }
    const test = setup(true, [], source)
    await test.settle()
    test.diagnostics.value = [diagnostic]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it('does not revive an obsolete independent error after a clean report and a later syntax edit', async () => {
    const source = 'onStart {\n\tglide 100,50,1\n\tprintln unknownName\n}\n'
    const edited = source.replace('50', '')
    const offset = source.indexOf('50')
    const baseline = problemAt(source, 'unknownName', 'undefined: unknownName')
    const anchor = problemAtOffset(edited, offset, "expected operand, found ','")
    const test = setup(true, [baseline], source)
    await test.settle()
    test.diagnostics.value = [anchor]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics?.map((item) => item.message)).toEqual(['undefined: unknownName'])
    test.diagnostics.value = []
    test.edit(source)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.diagnostics.value = [anchor]
    test.edit(edited)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([anchor])
  })

  it('keeps checking while a newly incomplete command is being edited and reveals it after leaving', async () => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.provideDiagnostics).toHaveBeenCalledTimes(2)
    expect(test.controller.diagnostics).toEqual([])
    test.emit('cursor', { position: { lineNumber: 2, column: 4 } })
    expect(test.controller.diagnostics).toEqual([])
    test.emit('cursor', { position: { lineNumber: 3, column: 1 } })
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it.each(['blur', 'paste'])('reveals current errors on %s', async (event) => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit(event)
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it('reveals before an explicit check and clears corrected diagnostics', async () => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    test.controller.reveal()
    expect(test.controller.diagnostics).toEqual([problem()])
    test.diagnostics.value = []
    test.edit('onStart {\n\tstep 20\n}\n')
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
  })

  it('continues deferring local new errors through repeated edits until the line is left', async () => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    test.diagnostics.value = [problem('Incomplete expression')]
    test.edit('onStart {\n\tstep -\n}\n')
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    expect(test.provideDiagnostics).toHaveBeenCalledTimes(3)
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([problem('Incomplete expression')])
  })

  it('reveals when another project file changes the meaning of a pending command', async () => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.changeOtherFile()
    await nextTick()
    expect(test.controller.diagnostics).toEqual([problem()])
    test.diagnostics.value = [problem('Argument type changed externally')]
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem('Argument type changed externally')])
  })

  it('does not treat a baseline from before an external definition change as a clean current baseline', async () => {
    const test = setup()
    await test.settle()
    test.changeOtherFile()
    test.diagnostics.value = [problem('Definition changed before local edit')]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem('Definition changed before local edit')])
  })

  it('retains other errors, warnings, runtime failures, unknown origins and nonlocal ranges', async () => {
    const existing = problem('Existing elsewhere', 1)
    const test = setup(true, [existing])
    await test.settle()
    const warning = { ...problem('Warning'), severity: DiagnosticSeverity.Warning }
    const runtime = problem('Runtime failure', 2, 'runtime')
    const unknown = problem('Unknown source', 2, null)
    const spanning = {
      ...problem('Spanning error'),
      range: { start: { line: 1, column: 1 }, end: { line: 3, column: 1 } }
    }
    test.diagnostics.value = [existing, problem(), warning, runtime, unknown, spanning]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([existing, warning, runtime, unknown, spanning])
  })

  it('keeps a line with a pre-existing diagnostic visible even if its message changes', async () => {
    const test = setup(true, [problem('Existing on this line')])
    await test.settle()
    test.diagnostics.value = [problem('A different error on the same line')]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual(test.diagnostics.value)
  })

  it('shows errors immediately when no checked baseline is available', async () => {
    const test = setup()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it('leaves Normal Mode diagnostics and event handling unchanged', async () => {
    const test = setup(false)
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
    test.emit('blur')
    expect(test.provideDiagnostics).toHaveBeenCalledTimes(2)
  })

  it.each([
    [
      'multiple changes',
      {
        changes: [
          { range: { startLineNumber: 2, endLineNumber: 2 }, text: '' },
          { range: { startLineNumber: 3, endLineNumber: 3 }, text: '' }
        ]
      }
    ],
    ['undo', { isUndoing: true }],
    ['redo', { isRedoing: true }],
    ['model reset', { isFlush: true }]
  ])('does not defer an ambiguous %s edit', async (_, overrides) => {
    const test = setup()
    await test.settle()
    test.diagnostics.value = [problem()]
    test.edit('onStart {\n\tstep\n}\n', overrides)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it.each(['multiple cursors', 'unfocused'])('does not defer %s input', async (kind) => {
    const test = setup()
    await test.settle()
    if (kind === 'multiple cursors') test.setSelectionCount(2)
    if (kind === 'unfocused') test.setFocused(false)
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it('keeps argument editing in the same call deferred through an IME composition', async () => {
    const test = setup()
    await test.settle()
    test.emit('compositionStart')
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('compositionEnd')
    await test.settle()
    expect(test.controller.diagnostics).toEqual([])
    test.emit('blur')
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it.each([1, null])('does not defer programmatic edits away from the active cursor line (%s)', async (cursorLine) => {
    const test = setup()
    await test.settle()
    test.setCursorLine(cursorLine)
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it('does not publish an older request after another edit, even before the debounce fires', async () => {
    const test = setup()
    await test.settle()
    let finish!: (value: Diagnostic[]) => void
    test.provideDiagnostics.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    test.edit('onStart {\n\tstep 20\n}\n', { isFlush: true })
    await test.settle()
    test.edit('onStart {\n\tstep 30\n}\n', { isFlush: true })
    finish([problem('Stale response')])
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(test.controller.diagnostics).toEqual([])
    test.diagnostics.value = [problem('Current response')]
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem('Current response')])
  })

  it('discards a pending old document response and never applies its deferral to another document', async () => {
    const test = setup()
    await test.settle()
    let finish!: (value: Diagnostic[]) => void
    test.provideDiagnostics.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    test.edit()
    await test.settle()
    test.switchDocument()
    finish([problem('Old document')])
    await nextTick()
    await Promise.resolve()
    expect(test.controller.diagnostics).toBeNull()
    test.diagnostics.value = [problem('New document')]
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem('New document')])
  })

  it('discards a result from a replaced provider before the next debounced request', async () => {
    const test = setup()
    await test.settle()
    let finish!: (value: Diagnostic[]) => void
    test.provideDiagnostics.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    test.controller.reveal()
    const replacement = test.replaceProvider([problem('New provider')])
    finish([problem('Old provider')])
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(test.controller.diagnostics).toEqual([])
    await test.settle()
    expect(replacement).toHaveBeenCalledOnce()
    expect(test.controller.diagnostics).toEqual([problem('New provider')])
  })

  it('waits for the project code to match the model before accepting a baseline', async () => {
    const test = setup()
    test.setOwnerSource('old project code')
    await test.settle()
    expect(test.provideDiagnostics).not.toHaveBeenCalled()
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
  })

  it('does not carry deferral across a changed callee', async () => {
    const test = setup()
    await test.settle()
    const source = 'onStart {\n\tturn\n}\n'
    const diagnostic = problemAt(source, 'turn', 'not enough arguments in call to turn')
    test.diagnostics.value = [diagnostic]
    test.edit(source)
    await test.settle()
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })

  it('fails closed when the editor event does not reconstruct the current source', async () => {
    const source = 'onStart {\n\tstep 10\n}\n'
    const test = setup(true, [], source)
    await test.settle()
    const edited = source.replace('10', '')
    const diagnostic = problemAt(edited, 'step', 'not enough arguments in call to step')
    test.diagnostics.value = [diagnostic]
    test.edit(edited, {
      changes: [
        {
          range: { startLineNumber: 2, startColumn: 7, endLineNumber: 2, endColumn: 8 },
          rangeOffset: source.indexOf('10'),
          rangeLength: 1,
          text: ''
        }
      ]
    })
    await test.settle()
    expect(test.controller.diagnostics).toEqual([diagnostic])
  })
})
