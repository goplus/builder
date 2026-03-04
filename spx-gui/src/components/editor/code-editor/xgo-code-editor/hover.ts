/**
 * @desc IHoverProvider interface + HoverProvider default implementation.
 * Uses ILSPClient + IDocumentBase. No spx-specific knowledge.
 */

import * as lsp from 'vscode-languageserver-protocol'
import type { BaseContext, DefinitionDocumentationString, Range, Position, Action } from './common'
import { makeAdvancedMarkdownString, containsPosition, fromLSPRange, toLSPPosition, type CommandArgs } from './common'
import type { IDocumentBase } from './document-base'
import type { ILSPClient } from './lsp/types'
import {
  builtInCommandCopilotExplain,
  CopilotExplainKind,
  builtInCommandGoToDefinition,
  builtInCommandRename
} from './ui/code-editor-ui'

export type Hover = {
  contents: DefinitionDocumentationString[]
  range?: Range
  actions: Action[]
}

export type HoverContext = BaseContext

export interface IHoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}

export class HoverProvider implements IHoverProvider {
  constructor(
    private lspClient: ILSPClient,
    private documentBase: IDocumentBase
  ) {}

  private async getExplainAction(ctx: HoverContext, position: Position) {
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

  private async getGoToDefinitionAction(position: Position, lspParams: lsp.TextDocumentPositionParams) {
    const [definition, typeDefinition] = (
      await Promise.all([
        this.lspClient.textDocumentDefinition({}, lspParams),
        this.lspClient.textDocumentTypeDefinition({}, lspParams)
      ])
    ).map((def) => {
      if (def == null) return null
      if (Array.isArray(def)) return def[0]
      return def
    })
    const location = definition ?? typeDefinition
    if (location == null) return null
    const range = fromLSPRange(location.range)
    if (containsPosition(range, position)) return null
    return {
      command: builtInCommandGoToDefinition,
      arguments: [
        {
          textDocument: { uri: location.uri },
          range
        }
      ] satisfies CommandArgs<typeof builtInCommandGoToDefinition>
    }
  }

  private async getRenameAction(ctx: HoverContext, position: Position, lspParams: lsp.TextDocumentPositionParams) {
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

  async provideHover(ctx: HoverContext, position: Position): Promise<Hover | null> {
    const lspParams = {
      textDocument: ctx.textDocument.id,
      position: toLSPPosition(position)
    }
    const lspHover = await this.lspClient.textDocumentHover({ signal: ctx.signal }, lspParams)
    if (lspHover == null) return null
    if (lspHover.range != null && !containsPosition(fromLSPRange(lspHover.range), position)) return null
    const contents: DefinitionDocumentationString[] = []
    if (lsp.MarkupContent.is(lspHover.contents)) {
      contents.push(makeAdvancedMarkdownString(lspHover.contents.value))
    }
    let range: Range | undefined = undefined
    if (lspHover.range != null) range = fromLSPRange(lspHover.range)
    const maybeActions = await Promise.all([
      this.getExplainAction(ctx, position),
      this.getGoToDefinitionAction(position, lspParams),
      this.getRenameAction(ctx, position, lspParams)
    ])
    const actions = maybeActions.filter((a) => a != null) as Action[]
    return { contents, range, actions }
  }
}
