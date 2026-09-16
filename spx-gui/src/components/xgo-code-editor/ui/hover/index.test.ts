import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Monaco, MonacoEditor } from '../../monaco'
import type { TextDocument } from '../../text-document'
import { HoverController } from '.'

function setup() {
  vi.useFakeTimers()
  const callbacks = new Map<string, (event?: unknown) => void>()
  const listen = (name: string) => (callback: (event?: unknown) => void) => {
    callbacks.set(name, callback)
    return { dispose: () => callbacks.delete(name) }
  }
  const element = document.createElement('div')
  const editor = {
    getDomNode: () => element,
    onMouseMove: listen('move'),
    onKeyDown: listen('key'),
    onMouseDown: listen('down'),
    onDidChangeModel: listen('model'),
    onDidChangeModelContent: listen('content'),
    onDidScrollChange: listen('scroll')
  } as unknown as MonacoEditor
  const range = { start: { line: 39, column: 6 }, end: { line: 39, column: 15 } }
  const provideHover = vi.fn().mockResolvedValue({ contents: [], actions: [], range })
  let textDocument = { id: { uri: 'file:///main.spx' } } as TextDocument
  const controller = new HoverController({
    editor,
    monaco: { editor: { MouseTargetType: { CONTENT_TEXT: 6 } } } as unknown as Monaco,
    codeEditor: { hoverProvider: { provideHover } },
    get activeTextDocument() {
      return textDocument
    }
  })
  controller.init()
  return {
    controller,
    editor,
    callbacks,
    provideHover,
    changeDocument() {
      textDocument = { id: { uri: 'file:///Board.spx' } } as TextDocument
      callbacks.get('model')?.()
    },
    move() {
      callbacks.get('move')?.({
        target: { type: 6, detail: {}, range: { startLineNumber: 39, startColumn: 6 } }
      })
    }
  }
}

afterEach(() => vi.useRealTimers())

describe('HoverController in a secondary editor', () => {
  it('uses its own editor and current document without requiring the main editor controllers', async () => {
    const { controller, editor, provideHover, move, changeDocument } = setup()
    expect(controller.editor).toBe(editor)
    move()
    await vi.advanceTimersByTimeAsync(60)
    expect(provideHover.mock.calls[0][0].textDocument.id.uri).toBe('file:///main.spx')
    expect(controller.hover).not.toBeNull()
    changeDocument()
    expect(controller.hover).toBeNull()
    move()
    await vi.advanceTimersByTimeAsync(60)
    expect(provideHover.mock.calls[1][0].textDocument.id.uri).toBe('file:///Board.spx')
    controller.dispose()
  })

  it.each(['model', 'content', 'scroll'])('cancels pending hover on %s changes', async (event) => {
    const { controller, callbacks, provideHover, move } = setup()
    move()
    callbacks.get(event)?.(event === 'scroll' ? { scrollTopChanged: true } : null)
    await vi.advanceTimersByTimeAsync(60)
    expect(provideHover).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('keeps the hover while Monaco recalculates content dimensions without scrolling', async () => {
    const { controller, callbacks, move } = setup()
    move()
    await vi.advanceTimersByTimeAsync(60)
    callbacks.get('scroll')?.({ scrollTopChanged: false, scrollLeftChanged: false })
    expect(controller.hover).not.toBeNull()
    controller.dispose()
  })

  it('cancels requests and listeners when Peek closes', async () => {
    const { controller, callbacks, provideHover, move } = setup()
    let resolve: (value: null) => void = () => {}
    provideHover.mockImplementationOnce(() => new Promise((done) => (resolve = done)))
    move()
    await vi.advanceTimersByTimeAsync(60)
    const signal = provideHover.mock.calls[0][0].signal
    controller.dispose()
    expect(signal.aborted).toBe(true)
    expect(callbacks.size).toBe(0)
    resolve(null)
    await vi.advanceTimersByTimeAsync(60)
    expect(controller.hover).toBeNull()
  })
})
