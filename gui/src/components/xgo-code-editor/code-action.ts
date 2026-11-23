import { isEqual } from 'lodash'
import * as lsp from 'vscode-languageserver-protocol'
import type { LocaleMessage } from '@/utils/i18n'
import {
  type Action,
  type BaseContext,
  type Range,
  type TextDocumentIdentifier,
  type TextEdit,
  toLSPRange,
  fromLSPTextEdit
} from './common'
import type { ILSPClient } from './lsp/types'
import { builtInCommandApplyCodeAction } from './ui/code-editor-ui'

export type CodeAction = {
  title: LocaleMessage
  textDocument: TextDocumentIdentifier
  source: string
  edits: TextEdit[]
}

export class CodeActionProvider {
  constructor(private lspClient: ILSPClient) {}

  async provideCodeActions(ctx: BaseContext, target: Range | lsp.Diagnostic): Promise<Action[]> {
    const textDocument = ctx.textDocument.id
    const source = ctx.textDocument.getValue()
    const { range, diagnostics } =
      'range' in target
        ? { range: target.range, diagnostics: [target] }
        : { range: toLSPRange(target), diagnostics: [] }
    const quickFixKind = lsp.CodeActionKind.QuickFix
    const result = await this.lspClient.textDocumentCodeAction(
      { signal: ctx.signal },
      {
        textDocument,
        range,
        context: { diagnostics, only: [quickFixKind] }
      }
    )
    if (result == null || ctx.textDocument.getValue() !== source) return []
    const [diagnostic] = diagnostics
    const actions: Action[] = []
    for (const action of result) {
      if (!lsp.CodeAction.is(action) || action.disabled != null || action.command != null) continue
      if (diagnostic != null) {
        if (action.kind !== quickFixKind && !action.kind?.startsWith(`${quickFixKind}.`)) continue
        if (!action.diagnostics?.some((item) => isEqual(item, diagnostic))) continue
      }
      const changes = action.edit?.changes
      // The source snapshot covers only this document.
      if (changes == null || Object.keys(changes).some((uri) => uri !== textDocument.uri)) continue
      const edits = changes[textDocument.uri]
      if (edits == null || edits.length === 0) continue
      const title = {
        en: action.title,
        zh: action.kind === 'quickfix.xgo.mergeVarDeclarations' ? '合并顶层 var 声明' : action.title
      }
      actions.push({
        title,
        command: builtInCommandApplyCodeAction,
        arguments: [{ title, textDocument, source, edits: edits.map(fromLSPTextEdit) } satisfies CodeAction]
      })
    }
    return actions
  }
}
