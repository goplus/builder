import { describe, expect, it, vi } from 'vitest'
import type { I18n } from '@/utils/i18n'
import type { CodeEditor } from '../code-editor'
import type { Range, TextDocumentIdentifier } from '../common'
import type { TextDocument } from '../text-document'
import type { MonacoEditor } from '../monaco'
import { CodeEditorUIController } from './code-editor-ui'

function makeTextDocument(uri: string, name: string) {
  return {
    id: { uri },
    displayName: { en: name, zh: name },
    monacoTextModel: { uri }
  } as unknown as TextDocument
}

function makeController() {
  const source = makeTextDocument('file:///source.spx', 'Source')
  const target = makeTextDocument('file:///target.spx', 'Target')
  const documents = new Map([
    [source.id.uri, source],
    [target.id.uri, target]
  ])
  const codeEditor = {
    getTextDocument: (id: TextDocumentIdentifier) => documents.get(id.uri) ?? null
  } as unknown as CodeEditor
  const i18n = { t: (message: { en: string }) => message.en } as unknown as I18n
  const controller = new CodeEditorUIController(source.id, codeEditor, i18n, vi.fn())
  const sourceViewState = { cursorState: [] }
  const editor = {
    saveViewState: vi.fn().mockReturnValueOnce(sourceViewState).mockReturnValue({ cursorState: [] }),
    setModel: vi.fn(),
    setSelection: vi.fn(),
    revealRangeNearTopIfOutsideViewport: vi.fn(),
    restoreViewState: vi.fn(),
    focus: vi.fn()
  } as unknown as MonacoEditor
  ;(controller as any)._editor = editor
  ;(controller as any).activeTextDocumentIdRef.value = source.id
  ;(controller as any).cursorPositionRef.value = { line: 12, column: 4 }
  return { controller, editor, source, sourceViewState, target }
}

const targetRange: Range = {
  start: { line: 5, column: 1 },
  end: { line: 5, column: 7 }
}

describe('CodeEditorUIController definition navigation', () => {
  it('opens a definition preview without changing the active document', () => {
    const { controller, source, target } = makeController()

    ;(controller as any).openDefinitionPeek({ textDocument: target.id, range: targetRange })

    expect(controller.activeTextDocument).toBe(source)
    expect(controller.definitionPeek).toEqual({ textDocument: target, range: targetRange })
  })

  it('returns to the document view state captured before navigation', () => {
    const { controller, editor, source, sourceViewState, target } = makeController()

    ;(controller as any).goToDefinition(
      { textDocument: target.id, range: targetRange },
      { textDocument: source.id, position: { line: 4, column: 18 } }
    )

    expect(controller.activeTextDocument).toBe(target)
    expect(controller.previousNavigationLocation).toMatchObject({
      textDocument: source,
      position: { line: 4, column: 18 },
      viewState: sourceViewState
    })

    controller.goBack()

    expect(controller.activeTextDocument).toBe(source)
    expect(controller.previousNavigationLocation).toBeNull()
    expect(editor.restoreViewState).toHaveBeenLastCalledWith(sourceViewState)
    expect(editor.focus).toHaveBeenCalled()
  })
})
