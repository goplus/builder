import { describe, expect, it, vi } from 'vitest'
import { SnippetParser } from '@/utils/snippet-parser'
import { functionDeclaration, varDeclaration } from '../document-base/xgo'
import { CodeEditorUIController } from './code-editor-ui'

describe('API Reference declaration insertion', () => {
  function controller(code: string) {
    return {
      parseSnippet: (snippet: string) => new SnippetParser().parse(snippet),
      activeTextDocument: {
        getValue: () => code,
        getPositionAt: (offset: number) => {
          const lines = code.slice(0, offset).split('\n')
          return { line: lines.length, column: lines.at(-1)!.length + 1 }
        }
      },
      insertBlockText: vi.fn(),
      insertInlineText: vi.fn(),
      insertText: vi.fn()
    }
  }

  const cursorRange = { start: { line: 3, column: 2 }, end: { line: 3, column: 2 } }

  it('inserts a valid variable default at the cursor', async () => {
    const ui = controller('onStart => {\n\n}\n')
    await CodeEditorUIController.prototype.insertDefinition.call(ui as any, varDeclaration, cursorRange)
    expect(ui.insertBlockText).toHaveBeenCalledExactlyOnceWith('var count int', cursorRange)
  })

  it.each(['', 'import "fmt"\n', 'import "fmt"; '])(
    'inserts functions outside events and after imports %j',
    async (header) => {
      const ui = controller(`${header}onStart => {\n\n}\n`)
      await CodeEditorUIController.prototype.insertDefinition.call(ui as any, functionDeclaration, cursorRange)
      const position = ui.activeTextDocument.getPositionAt(header.length)
      const prefix = position.column === 1 ? '' : '\n'
      expect(ui.insertText).toHaveBeenCalledExactlyOnceWith(`${prefix}func doSomething() {\n\t\n}\n`, {
        start: position,
        end: position
      })
      expect(ui.insertBlockText).not.toHaveBeenCalled()
      expect(ui.insertInlineText).not.toHaveBeenCalled()
    }
  )
})
