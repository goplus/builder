import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { CodeEditorUIController } from '../code-editor-ui'
import { CompletionController, CompletionItemKind, InsertTextFormat, type CompletionList } from '.'

function setup(word: string) {
  const readOnly = ref(false)
  const handlers: Record<string, (...args: any[]) => void> = {}
  const editor = Object.fromEntries(
    ['onKeyDown', 'onDidCompositionStart', 'onDidType', 'onDidCompositionEnd', 'onDidChangeCursorSelection'].map(
      (event) => [
        event,
        (handler: (...args: any[]) => void) => {
          handlers[event] = handler
          return { dispose() {} }
        }
      ]
    )
  )
  const provideCompletion = vi.fn(
    async (): Promise<CompletionList> => ({
      items: [
        {
          definition: null,
          label: word,
          kind: word === 'turn' ? CompletionItemKind.Function : CompletionItemKind.Variable,
          filterSortText: word,
          insertText: word,
          insertTextFormat: InsertTextFormat.PlainText,
          textEdit: null,
          documentation: null
        }
      ],
      isIncomplete: false
    })
  )
  const ui = {
    get readOnly() {
      return readOnly.value
    },
    editor,
    monaco: { editor: { CursorChangeReason: {} } },
    activeTextDocument: {
      getWordAtPosition: () => ({ startColumn: 1 }),
      getValueInRange: () => word
    },
    cursorPosition: { line: 1, column: word.length + 1 },
    codeEditor: { completionProvider: { provideCompletion } }
  } as unknown as CodeEditorUIController
  const controller = new CompletionController(ui)
  controller.init()
  return { readOnly, handlers, provideCompletion, controller }
}

describe('read-only completion', () => {
  it.each(['turn', 'score'])('blocks typed and composed input at %s across run/stop cycles', async (word) => {
    const { readOnly, handlers, provideCompletion, controller } = setup(word)
    try {
      for (let i = 0; i < 2; i++) {
        readOnly.value = true
        handlers.onDidType('a')
        handlers.onDidCompositionStart()
        handlers.onDidCompositionEnd()
        controller.startCompletion()
        await flushPromises()
        expect(provideCompletion).not.toHaveBeenCalled()
        readOnly.value = false
        await flushPromises()
        expect(controller.completion).toBeNull()
      }
      handlers.onDidType('a')
      await flushPromises()
      expect(provideCompletion).toHaveBeenCalledOnce()
      expect(controller.nonEmptyItems?.map((item) => item.label)).toEqual([word])
      readOnly.value = true
      expect(controller.completion).toBeNull()
    } finally {
      controller.dispose()
    }
  })

  it('cancels an in-flight completion when a run starts, even if it resolves after stopping', async () => {
    const { readOnly, provideCompletion, controller } = setup('turn')
    let resolve!: (list: CompletionList) => void
    provideCompletion.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    try {
      controller.startCompletion()
      readOnly.value = true
      readOnly.value = false
      resolve({ items: [], isIncomplete: false })
      await flushPromises()
      expect(controller.completion).toBeNull()
      controller.startCompletion()
      await flushPromises()
      expect(controller.completion).not.toBeNull()
    } finally {
      controller.dispose()
    }
  })
})
