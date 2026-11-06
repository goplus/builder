import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { InputKind } from '../../common'
import {
  builtInCommandCopilotExplain,
  builtInCommandInvokeInputHelper,
  type CodeEditorUIController
} from '../code-editor-ui'
import { HoverController } from '.'

describe('Hover Controller actions', () => {
  it('generates input-helper actions only when editable, keeping explanation available', async () => {
    vi.useFakeTimers()
    const readOnly = ref(false)
    const mouseMove = vi.fn()
    const range = { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
    const ui = {
      get readOnly() {
        return readOnly.value
      },
      activeTextDocument: {},
      codeEditor: {
        hoverProvider: {
          provideHover: async () => ({
            contents: [],
            range,
            actions: [{ command: builtInCommandCopilotExplain, arguments: [] }]
          })
        }
      },
      diagnosticsController: { diagnostics: [] },
      resourceReferenceController: { items: [], on: () => vi.fn() },
      inputHelperController: {
        inputingSlot: null,
        slots: [{ id: 'slot', range, input: { kind: InputKind.Predefined } }]
      },
      inlayHintController: { items: [] },
      monaco: { editor: { MouseTargetType: { CONTENT_TEXT: 1 } } },
      editor: {
        onMouseMove: (listener: unknown) => {
          mouseMove.mockImplementation(listener as () => void)
          return { dispose: vi.fn() }
        },
        onKeyDown: () => ({ dispose: vi.fn() }),
        onMouseDown: () => ({ dispose: vi.fn() }),
        getDomNode: () => document.createElement('div')
      }
    } as unknown as CodeEditorUIController
    const controller = new HoverController(ui)
    try {
      controller.init()
      mouseMove({
        target: { type: 1, detail: { mightBeForeignElement: false }, range: { startLineNumber: 1, startColumn: 2 } }
      })
      await vi.runAllTimersAsync()
      expect(controller.hover?.actions.map((action) => action.command)).toEqual([
        builtInCommandInvokeInputHelper,
        builtInCommandCopilotExplain
      ])
      readOnly.value = true
      controller.hideHover()
      mouseMove({
        target: { type: 1, detail: { mightBeForeignElement: false }, range: { startLineNumber: 1, startColumn: 2 } }
      })
      await vi.runAllTimersAsync()
      expect(controller.hover?.actions.map((action) => action.command)).toEqual([builtInCommandCopilotExplain])
      readOnly.value = false
      controller.hideHover()
      mouseMove({
        target: { type: 1, detail: { mightBeForeignElement: false }, range: { startLineNumber: 1, startColumn: 2 } }
      })
      await vi.runAllTimersAsync()
      expect(controller.hover?.actions.map((action) => action.command)).toEqual([
        builtInCommandInvokeInputHelper,
        builtInCommandCopilotExplain
      ])
    } finally {
      controller.dispose()
      vi.useRealTimers()
    }
  })
})
