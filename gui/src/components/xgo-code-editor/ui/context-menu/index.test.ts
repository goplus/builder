import { ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
  builtInCommandApplyCodeAction,
  builtInCommandCopilotExplain,
  type CodeEditorUIController
} from '../code-editor-ui'
import { ContextMenuController } from '.'

describe('Context Menu entry', () => {
  it('ignores right-clicks while read-only and opens the menu after editing resumes', async () => {
    vi.useFakeTimers()
    const readOnly = ref(true)
    const mouseDown = vi.fn()
    const provideContextMenu = vi.fn(async () => [])
    const provideCodeActions = vi.fn(async () => [
      { title: { en: 'Merge fields', zh: 'Merge fields' }, command: builtInCommandApplyCodeAction, arguments: [] }
    ])
    const ui = {
      get readOnly() {
        return readOnly.value
      },
      activeTextDocument: {},
      codeEditor: {
        contextMenuProvider: { provideContextMenu },
        codeActionProvider: { provideCodeActions }
      },
      resolveAction: (action: unknown) => action,
      monaco: {
        editor: { MouseTargetType: { CONTENT_TEXT: 1, CONTENT_EMPTY: 2, CONTENT_WIDGET: 3 } },
        KeyCode: { Escape: 9 }
      },
      editor: {
        onMouseDown: (listener: unknown) => {
          mouseDown.mockImplementation(listener as () => void)
          return { dispose: vi.fn() }
        },
        onKeyDown: () => ({ dispose: vi.fn() }),
        onContextMenu: () => ({ dispose: vi.fn() }),
        getSelection: () => ({ isEmpty: () => true, getPosition: () => ({ lineNumber: 1, column: 1 }) })
      }
    } as unknown as CodeEditorUIController
    const controller = new ContextMenuController(ui)
    try {
      controller.init()
      const event = { target: { type: 1 }, event: { rightButton: true, posx: 10, posy: 20 } }
      mouseDown(event)
      await vi.runAllTimersAsync()
      expect(provideContextMenu).not.toHaveBeenCalled()
      expect(provideCodeActions).not.toHaveBeenCalled()
      expect(controller.menuData).toBeNull()
      readOnly.value = false
      mouseDown(event)
      await vi.runAllTimersAsync()
      expect(provideContextMenu).toHaveBeenCalledTimes(1)
      expect(provideCodeActions).toHaveBeenCalledWith(
        { textDocument: ui.activeTextDocument, signal: expect.any(AbortSignal) },
        { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      )
      expect(controller.menuData?.groups[0][0].title).toEqual({ en: 'Merge fields', zh: 'Merge fields' })
      expect(controller.menuData?.position).toEqual({ left: 10, top: 20 })
    } finally {
      controller.dispose()
      vi.useRealTimers()
    }
  })

  it.each([false, true])('preserves selection menu actions if loading fixes fails (%s)', async (failed) => {
    const action = {
      title: { en: 'Merge fields', zh: 'Merge fields' },
      command: builtInCommandApplyCodeAction,
      arguments: []
    }
    const explain = {
      title: { en: 'Explain selection', zh: 'Explain selection' },
      command: builtInCommandCopilotExplain,
      arguments: []
    }
    const provideCodeActions = vi.fn(async () => [action])
    if (failed) provideCodeActions.mockRejectedValue(new Error('Request failed'))
    const executeCommand = vi.fn()
    const ui = {
      activeTextDocument: {},
      codeEditor: {
        contextMenuProvider: { provideSelectionContextMenu: async () => [explain] },
        codeActionProvider: { provideCodeActions }
      },
      resolveAction: (value: unknown) => value,
      executeCommand
    } as unknown as CodeEditorUIController
    const controller = new ContextMenuController(ui)
    onTestFinished(() => controller.dispose())
    const selection = { start: { line: 1, column: 1 }, position: { line: 3, column: 1 } }
    controller.showMenuForTriggerClick({ left: 10, top: 20 }, selection)
    const item = failed ? explain : action
    await vi.waitFor(() => expect(controller.menuData?.groups[0][0].title).toEqual(item.title))
    expect(provideCodeActions).toHaveBeenCalledWith(
      { textDocument: ui.activeTextDocument, signal: expect.any(AbortSignal) },
      { start: selection.start, end: selection.position }
    )
    await controller.executeMenuItem(item)
    expect(executeCommand).toHaveBeenCalledWith(item.command)
    expect(controller.menuData).toBeNull()
  })
})
