/**
 * @desc IContextMenuProvider interface + ContextMenuProvider default implementation.
 * Uses ILSPClient + IDocumentBase. No spx-specific knowledge.
 */

import type { Action, BaseContext, Position, Selection } from './common'
import { selection2Range, fromLSPRange, toLSPPosition, type CommandArgs } from './common'
import type { IDocumentBase } from './document-base'
import * as lsp from 'vscode-languageserver-protocol'
import type { ILSPClient } from './lsp/types'
import {
  builtInCommandCopilotExplain,
  CopilotExplainKind,
  builtInCommandCopilotReview,
  builtInCommandRename
} from './ui/code-editor-ui'

export type MenuItem = Action

export type ContextMenuContext = BaseContext

export interface IContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}

export class ContextMenuProvider implements IContextMenuProvider {
  constructor(
    private lspClient: ILSPClient,
    private documentBase: IDocumentBase
  ) {}

  private async getExplainMenuItemForPosition(ctx: ContextMenuContext, position: Position) {
    const defId = await this.lspClient.getDefinition({ signal: ctx.signal }, ctx.textDocument.id, position)
    if (defId == null) return null
    const definition = await this.documentBase.getDocumentation(defId)
    if (definition == null) return null
    return {
      command: builtInCommandCopilotExplain,
      arguments: [
        {
          kind: CopilotExplainKind.Definition,
          overview: definition.overview,
          definition: definition.definition
        }
      ] satisfies CommandArgs<typeof builtInCommandCopilotExplain>
    }
  }

  private async getRenameMenuItemForPosition(ctx: ContextMenuContext, position: Position) {
    const lspParams: lsp.TextDocumentPositionParams = {
      textDocument: ctx.textDocument.id,
      position: toLSPPosition(position)
    }
    const result = await this.lspClient.textDocumentPrepareRename({ signal: ctx.signal }, lspParams)
    if (result == null || !lsp.Range.is(result)) return null
    return {
      command: builtInCommandRename,
      arguments: [
        {
          textDocument: ctx.textDocument.id,
          position,
          range: fromLSPRange(result)
        }
      ] satisfies CommandArgs<typeof builtInCommandRename>
    }
  }

  async provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]> {
    const maybeItems = await Promise.all([
      this.getExplainMenuItemForPosition(ctx, position),
      this.getRenameMenuItemForPosition(ctx, position)
    ])
    return maybeItems.filter((item) => item != null) as MenuItem[]
  }

  async provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]> {
    const range = selection2Range(selection)
    const code = ctx.textDocument.getValueInRange(range)
    return [
      {
        command: builtInCommandCopilotExplain,
        arguments: [
          {
            kind: CopilotExplainKind.CodeSegment,
            codeSegment: {
              textDocument: ctx.textDocument.id,
              range,
              content: code
            }
          }
        ] satisfies CommandArgs<typeof builtInCommandCopilotExplain>
      },
      {
        command: builtInCommandCopilotReview,
        arguments: [
          {
            textDocument: ctx.textDocument.id,
            range,
            code
          }
        ] satisfies CommandArgs<typeof builtInCommandCopilotReview>
      }
    ]
  }
}
