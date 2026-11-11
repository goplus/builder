import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { fromText, type Files } from '@/models/common/file'
import { DiagnosticSeverity, type Diagnostic } from '../../common'
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

function setup(simpleMode = true, initialDiagnostics: Diagnostic[] = []) {
  let source = 'onStart {\n\tstep 10\n}\n'
  let ownerSource = source
  let version = 1
  let focused = true
  let selectionCount = 1
  let cursorLine: number | null = 2
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
      getPosition: () => (cursorLine == null ? null : { lineNumber: cursorLine, column: 6 }),
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
    if (name === 'cursor') cursorLine = value.position.lineNumber
    listeners.get(name)?.(value)
  }
  function edit(nextSource = 'onStart {\n\tstep\n}\n', overrides: Record<string, unknown> = {}) {
    source = nextSource
    ownerSource = nextSource
    version++
    files.value = { ...files.value, 'Lita.spx': fromText('Lita.spx', source) }
    emit('content', {
      versionId: version,
      isFlush: false,
      isUndoing: false,
      isRedoing: false,
      changes: [{ range: { startLineNumber: 2, startColumn: 6, endLineNumber: 2, endColumn: 9 }, text: '' }],
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
      cursorLine = value
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
    ['newline', { changes: [{ range: { startLineNumber: 2, endLineNumber: 2 }, text: '\n' }] }],
    ['multiline selection', { changes: [{ range: { startLineNumber: 2, endLineNumber: 3 }, text: '' }] }],
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

  it.each(['composition', 'multiple cursors', 'unfocused'])('does not defer %s input', async (kind) => {
    const test = setup()
    await test.settle()
    if (kind === 'composition') test.emit('compositionStart')
    if (kind === 'multiple cursors') test.setSelectionCount(2)
    if (kind === 'unfocused') test.setFocused(false)
    test.diagnostics.value = [problem()]
    test.edit()
    await test.settle()
    expect(test.controller.diagnostics).toEqual([problem()])
    if (kind === 'composition') test.emit('compositionEnd')
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
})
