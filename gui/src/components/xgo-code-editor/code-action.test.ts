import { describe, expect, it, vi } from 'vitest'
import type * as lsp from 'vscode-languageserver-protocol'
import type { ITextDocument } from './common'
import type { ILSPClient } from './lsp/types'
import { builtInCommandApplyCodeAction } from './ui/code-editor-ui'
import { CodeActionProvider, type CodeAction } from './code-action'

const uri = 'file:///main.spx'
const source = 'var score int\nvar speed int\n'
const range = { start: { line: 2, column: 1 }, end: { line: 2, column: 1 } }
const edit: lsp.WorkspaceEdit = {
  changes: {
    [uri]: [{ range: { start: { line: 0, character: 0 }, end: { line: 2, character: 0 } }, newText: 'var ()\n' }]
  }
}

function setup() {
  let content = source
  const textDocument = { id: { uri }, getValue: () => content } as ITextDocument
  const textDocumentCodeAction = vi.fn<ILSPClient['textDocumentCodeAction']>()
  const provider = new CodeActionProvider({ textDocumentCodeAction } as unknown as ILSPClient)
  return {
    provider,
    textDocumentCodeAction,
    ctx: { textDocument, signal: new AbortController().signal },
    setContent: (value: string) => (content = value)
  }
}

describe('CodeActionProvider', () => {
  it('requests quick fixes and binds converted edits to the source that produced them', async () => {
    const { provider, ctx, textDocumentCodeAction, setContent } = setup()
    textDocumentCodeAction.mockResolvedValue([{ title: 'Merge fields', kind: 'quickfix', edit }])
    const actions = await provider.provideCodeActions(ctx, range)
    expect(textDocumentCodeAction).toHaveBeenCalledWith(
      { signal: ctx.signal },
      {
        textDocument: { uri },
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
        context: { diagnostics: [], only: ['quickfix'] }
      }
    )
    expect(actions).toEqual([
      {
        title: { en: 'Merge fields', zh: 'Merge fields' },
        command: builtInCommandApplyCodeAction,
        arguments: [
          {
            title: { en: 'Merge fields', zh: 'Merge fields' },
            textDocument: { uri },
            source,
            edits: [{ range: { start: { line: 1, column: 1 }, end: { line: 3, column: 1 } }, newText: 'var ()\n' }]
          } satisfies CodeAction
        ]
      }
    ])
    setContent('println 1\n')
    expect(actions[0].arguments[0].source).toBe(source)
  })

  it('localizes known kinds without matching titles and preserves unknown titles', async () => {
    const { provider, ctx, textDocumentCodeAction } = setup()
    textDocumentCodeAction.mockResolvedValue([
      { title: 'Merge fields', kind: 'quickfix.xgo.mergeVarDeclarations', edit },
      { title: 'Merge top-level var declarations', kind: 'quickfix.other', edit },
      { title: 'Merge top-level var declarations', edit }
    ])
    const actions = await provider.provideCodeActions(ctx, range)
    expect(actions.map((action) => action.title)).toEqual([
      { en: 'Merge fields', zh: '合并顶层 var 声明' },
      { en: 'Merge top-level var declarations', zh: 'Merge top-level var declarations' },
      { en: 'Merge top-level var declarations', zh: 'Merge top-level var declarations' }
    ])
    expect(actions[0].arguments[0].title).toEqual(actions[0].title)
  })

  it('uses the raw diagnostic range and keeps only actions that explicitly resolve the diagnostic', async () => {
    const { provider, ctx, textDocumentCodeAction } = setup()
    const diagnostic: lsp.Diagnostic = {
      range: { start: { line: 1, character: 0 }, end: { line: 1, character: 13 } },
      severity: 1,
      message: 'Multiple var declarations'
    }
    const action = { kind: 'quickfix.xgo.mergeVarDeclarations', edit }
    const otherRange = { start: { line: 1, character: 1 }, end: diagnostic.range.end }
    textDocumentCodeAction.mockResolvedValue([
      { ...action, title: 'Merge fields', diagnostics: [{ ...diagnostic }] },
      { ...action, title: 'Other problem', diagnostics: [{ ...diagnostic, message: 'Missing type' }] },
      { ...action, title: 'Other severity', diagnostics: [{ ...diagnostic, severity: 2 }] },
      { ...action, title: 'Other range', diagnostics: [{ ...diagnostic, range: otherRange }] },
      { ...action, title: 'Unassociated' },
      { ...action, title: 'Refactor', kind: 'refactor', diagnostics: [diagnostic] }
    ])
    const actions = await provider.provideCodeActions(ctx, diagnostic)
    expect(textDocumentCodeAction).toHaveBeenCalledWith(
      { signal: ctx.signal },
      { textDocument: { uri }, range: diagnostic.range, context: { diagnostics: [diagnostic], only: ['quickfix'] } }
    )
    expect(actions.map((action) => action.title?.en)).toEqual(['Merge fields'])
  })

  it('does not offer unsupported, disabled, or empty actions', async () => {
    const { provider, ctx, textDocumentCodeAction } = setup()
    textDocumentCodeAction.mockResolvedValue([
      { title: 'Command', command: 'unsupported' },
      { title: 'Disabled', edit, disabled: { reason: 'Unavailable' } },
      { title: 'Edit and command', edit, command: { title: 'Command', command: 'unsupported' } },
      { title: 'Unresolved' },
      { title: 'Empty', edit: { changes: { [uri]: [] } } },
      { title: 'Other document', edit: { changes: { ...edit.changes, 'file:///other.spx': [] } } },
      { title: 'Versioned', edit: { documentChanges: [] } }
    ])
    expect(await provider.provideCodeActions(ctx, range)).toEqual([])
  })

  it.each([null, []])('handles an empty response: %s', async (response) => {
    const { provider, ctx, textDocumentCodeAction } = setup()
    textDocumentCodeAction.mockResolvedValue(response)
    expect(await provider.provideCodeActions(ctx, range)).toEqual([])
  })

  it('discards a response when the source changes during the request', async () => {
    const { provider, ctx, textDocumentCodeAction, setContent } = setup()
    textDocumentCodeAction.mockImplementation(async () => {
      setContent('println 1\n')
      return [{ title: 'Merge fields', edit }]
    })
    expect(await provider.provideCodeActions(ctx, range)).toEqual([])
  })

  it('propagates request failures to the UI boundary', async () => {
    const { provider, ctx, textDocumentCodeAction } = setup()
    const error = new Error('Request failed')
    textDocumentCodeAction.mockRejectedValue(error)
    await expect(provider.provideCodeActions(ctx, range)).rejects.toBe(error)
  })
})
