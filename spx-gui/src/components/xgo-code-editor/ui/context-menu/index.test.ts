import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { CodeEditorUIController } from '../code-editor-ui'
import { ContextMenuController } from '.'

describe('Context Menu entry', () => {
  it('ignores right-clicks while read-only and opens the menu after editing resumes', async () => {
    vi.useFakeTimers()
    const readOnly = ref(true)
    const mouseDown = vi.fn()
    const provideContextMenu = vi.fn(async () => [])
    const ui = {
      get readOnly() {
        return readOnly.value
      },
      activeTextDocument: {},
      codeEditor: { contextMenuProvider: { provideContextMenu } },
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
      expect(controller.menuData).toBeNull()
      readOnly.value = false
      mouseDown(event)
      await vi.runAllTimersAsync()
      expect(provideContextMenu).toHaveBeenCalledTimes(1)
      expect(controller.menuData?.position).toEqual({ left: 10, top: 20 })
    } finally {
      controller.dispose()
      vi.useRealTimers()
    }
  })
})
