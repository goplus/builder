import { ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type * as lsp from 'vscode-languageserver-protocol'
import { DiagnosticSeverity, InputKind, type Position } from '../../common'
import { CodeActionProvider } from '../../code-action'
import { DiagnosticsProvider } from '../../diagnostics'
import type { ILSPClient } from '../../lsp/types'
import type { IXGoProject } from '../../project'
import { DiagnosticsController } from '../diagnostics'
import {
  builtInCommandCopilotExplain,
  builtInCommandCopilotFixProblem,
  builtInCommandApplyCodeAction,
  builtInCommandInvokeInputHelper,
  type CodeEditorUIController
} from '../code-editor-ui'
import { HoverController } from '.'

describe('Hover Controller actions', () => {
  it.each([
    'one match',
    'no match',
    'multiple fixes',
    'duplicate diagnostics',
    'runtime diagnostic',
    'stale diagnostics',
    'project changed during request',
    'request failed',
    'read only'
  ])('chooses a repair for the hovered diagnostic: %s', async (scenario) => {
    vi.useFakeTimers()
    const readOnly = ref(scenario === 'read only')
    const mouseMove = vi.fn()
    const source = 'var score int\nvar speed int\n'
    const uri = 'file:///main.spx'
    const position = { line: 0, character: 1 }
    const diagnostic: lsp.Diagnostic = {
      range: { start: position, end: position },
      severity: 1,
      message: 'Multiple var declarations'
    }
    let files = {}
    const project = {
      exportFiles: () => files,
      getCodeOwner: () => ({ getCode: () => source })
    } as unknown as IXGoProject
    const workspaceDiagnostic = vi.fn<ILSPClient['workspaceDiagnostic']>(async () => ({
      items: [
        {
          uri,
          kind: 'full',
          version: null,
          items: scenario === 'duplicate diagnostics' ? [diagnostic, { ...diagnostic }] : [diagnostic]
        }
      ]
    }))
    const textDocumentCodeAction = vi.fn<ILSPClient['textDocumentCodeAction']>(async () => {
      if (scenario === 'request failed') throw new Error('Request failed')
      if (scenario === 'project changed during request') files = {}
      const action: lsp.CodeAction = {
        title: 'Merge fields',
        kind: 'quickfix',
        diagnostics: [{ ...diagnostic }],
        edit: { changes: { [uri]: [{ range: diagnostic.range, newText: 'var ()' }] } }
      }
      if (scenario === 'no match') return [{ ...action, diagnostics: [] }]
      if (scenario === 'multiple fixes') return [action, { ...action, title: 'Other fix' }]
      return [action]
    })
    const lspClient = { workspaceDiagnostic, textDocumentCodeAction } as unknown as ILSPClient
    const diagnosticsProvider = new DiagnosticsProvider(lspClient, project)
    if (scenario === 'runtime diagnostic') {
      vi.spyOn(diagnosticsProvider, 'provideDiagnostics').mockResolvedValue([
        {
          range: { start: { line: 1, column: 2 }, end: { line: 1, column: 3 } },
          severity: DiagnosticSeverity.Error,
          message: diagnostic.message,
          lspDiagnostic: null
        }
      ])
    }
    const ui = {
      get readOnly() {
        return readOnly.value
      },
      project,
      activeTextDocument: {
        id: { uri },
        getValue: () => source,
        getOffsetAt: ({ column }: Position) => column - 1,
        getPositionAt: (offset: number) => ({ line: 1, column: offset + 1 })
      },
      codeEditor: {
        hoverProvider: { provideHover: async () => null },
        diagnosticsProvider,
        codeActionProvider: new CodeActionProvider(lspClient)
      },
      get diagnosticsController(): DiagnosticsController {
        return diagnosticsController
      },
      resourceReferenceController: { items: [], on: () => vi.fn() },
      inputHelperController: { inputingSlot: null, slots: [] },
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
    const diagnosticsController = new DiagnosticsController(ui)
    const hoverController = new HoverController(ui)
    onTestFinished(() => {
      hoverController.dispose()
      diagnosticsController.dispose()
      diagnosticsProvider.dispose()
      vi.useRealTimers()
    })
    diagnosticsController.init()
    hoverController.init()
    await vi.runAllTimersAsync()
    if (scenario === 'stale diagnostics') files = {}

    mouseMove({
      target: { type: 1, detail: { mightBeForeignElement: false }, range: { startLineNumber: 1, startColumn: 2 } }
    })
    await vi.runAllTimersAsync()
    const useQuickFix = scenario === 'one match'
    expect(hoverController.hover?.contents).toHaveLength(1)
    expect(hoverController.hover?.actions.map((action) => action.command)).toEqual([
      useQuickFix ? builtInCommandApplyCodeAction : builtInCommandCopilotFixProblem
    ])
    const skipRequest = ['duplicate diagnostics', 'runtime diagnostic', 'stale diagnostics', 'read only'].includes(
      scenario
    )
    expect(textDocumentCodeAction).toHaveBeenCalledTimes(skipRequest ? 0 : 1)
    if (useQuickFix) {
      expect(hoverController.hover?.actions[0].title?.en).toBe('Fix problem')
      expect(hoverController.hover?.actions[0].arguments[0].title.en).toBe('Merge fields')
      readOnly.value = true
      expect(hoverController.hover).toBeNull()
    }
  })

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
