import { describe, expect, it, vi } from 'vitest'
import type { I18n } from '@/utils/i18n'
import type { CodeEditor } from '../code-editor'
import type { Range, TextDocumentIdentifier, TextDocumentPosition, TextDocumentRange } from '../common'
import type { TextDocument } from '../text-document'
import type { MonacoEditor } from '../monaco'
import { CodeEditorUIController } from './code-editor-ui'

function makeTextDocument(uri: string, name: string) {
  return {
    id: { uri },
    displayName: { en: name, zh: name },
    monacoTextModel: { uri },
    getLineContent: (line: number) => `${name} line ${line}`
  } as unknown as TextDocument
}

function makeController() {
  const source = makeTextDocument('file:///source.spx', 'Source')
  const target = makeTextDocument('file:///target.spx', 'Target')
  const other = makeTextDocument('file:///other.spx', 'Other')
  const documents = new Map([source, target, other].map((document) => [document.id.uri, document]))
  const codeEditor = {
    getTextDocument: (id: TextDocumentIdentifier) => documents.get(id.uri) ?? null
  } as unknown as CodeEditor
  const i18n = { t: (message: { en: string }) => message.en } as unknown as I18n
  const controller = new CodeEditorUIController(source.id, codeEditor, i18n, vi.fn())
  const sourceViewState = { cursorState: [{ position: { lineNumber: 4, column: 18 } }] }
  const targetViewState = { cursorState: [{ position: { lineNumber: 5, column: 1 } }] }
  const editor = {
    saveViewState: vi.fn().mockReturnValueOnce(sourceViewState).mockReturnValue(targetViewState),
    setModel: vi.fn(),
    setSelection: vi.fn(),
    revealRangeNearTopIfOutsideViewport: vi.fn(),
    restoreViewState: vi.fn(),
    focus: vi.fn()
  } as unknown as MonacoEditor
  ;(controller as any)._editor = editor
  ;(controller as any).activeTextDocumentIdRef.value = source.id
  ;(controller as any).cursorPositionRef.value = { line: 4, column: 18 }
  ;(controller as any).observeDefinition = vi.fn()
  return { controller, editor, source, sourceViewState, target, other }
}

const targetRange: Range = {
  start: { line: 5, column: 1 },
  end: { line: 5, column: 7 }
}

function sourceAt(textDocument: TextDocument, line = 4): TextDocumentPosition {
  return { textDocument: textDocument.id, position: { line, column: 18 } }
}

function targetAt(textDocument: TextDocument, line = 5): TextDocumentRange {
  return {
    textDocument: textDocument.id,
    range: { ...targetRange, start: { line, column: 1 }, end: { line, column: 7 } }
  }
}

describe('CodeEditorUIController definition navigation', () => {
  it('opens a definition directly and records the origin for back navigation', () => {
    const { controller, source, sourceViewState, target } = makeController()

    ;(controller as any).openDefinition(targetAt(target), sourceAt(source))

    expect(controller.activeTextDocument).toBe(target)
    expect(controller.previousNavigationLocation).toMatchObject({
      textDocument: source,
      position: { line: 4, column: 18 },
      viewState: sourceViewState
    })
    expect((controller as any).observeDefinition).toHaveBeenCalledWith(targetAt(target))
  })

  it('opens one reference directly without showing the selection modal', () => {
    const { controller, source, target, other } = makeController()

    ;(controller as any).openReferences(targetAt(target), sourceAt(source), [targetAt(other, 9)])

    expect(controller.activeTextDocument).toBe(other)
    expect(controller.referenceSelection).toBeNull()
    expect(controller.previousNavigationLocation?.textDocument).toBe(source)
  })

  it('shows the modal for multiple references and opens the selected reference on request', () => {
    const { controller, source, target, other } = makeController()
    const references = [targetAt(source, 7), targetAt(other, 9)]

    ;(controller as any).openReferences(targetAt(target), sourceAt(source), references)

    expect(controller.activeTextDocument).toBe(source)
    expect(controller.previousNavigationLocation).toBeNull()
    expect(controller.referenceSelection?.references).toHaveLength(2)

    controller.openSelectedReference(controller.referenceSelection!.references[1])
    expect(controller.activeTextDocument).toBe(other)
    expect(controller.referenceSelection).toBeNull()
    expect(controller.previousNavigationLocation?.textDocument).toBe(source)
  })

  it('does nothing when no references are available', () => {
    const { controller, source, target } = makeController()

    ;(controller as any).openReferences(targetAt(target), sourceAt(source), [])

    expect(controller.activeTextDocument).toBe(source)
    expect(controller.referenceSelection).toBeNull()
    expect(controller.previousNavigationLocation).toBeNull()
  })

  it('returns one level at a time and can exit to the first origin', () => {
    const { controller, editor, source, sourceViewState, target, other } = makeController()

    ;(controller as any).openDefinition(targetAt(target), sourceAt(source))
    ;(controller as any).openDefinition(targetAt(other, 9), sourceAt(target, 5))

    controller.goBack()
    expect(controller.activeTextDocument).toBe(target)
    expect(controller.previousNavigationLocation?.textDocument).toBe(source)
    ;(controller as any).openDefinition(targetAt(other, 9), sourceAt(target, 5))
    controller.exitNavigation()
    expect(controller.activeTextDocument).toBe(source)
    expect(controller.previousNavigationLocation).toBeNull()
    expect(editor.restoreViewState).toHaveBeenLastCalledWith(sourceViewState)
  })
})
