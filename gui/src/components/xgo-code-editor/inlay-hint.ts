/**
 * @desc IInlayHintProvider interface + InlayHintProvider default implementation.
 * Uses ILSPClient. No spx-specific knowledge.
 */

import * as lsp from 'vscode-languageserver-protocol'
import type { BaseContext, BasicMarkdownString, Position } from './common'
import { fromLSPPosition, makeBasicMarkdownString, toLSPRange } from './common'
import type { ILSPClient } from './lsp/types'

export enum InlayHintKind {
  Parameter = 2
}

export type InlayHintItem = {
  label: string
  kind: InlayHintKind
  position: Position
  tooltip: BasicMarkdownString | null
}

export type InlayHintContext = BaseContext

export interface IInlayHintProvider {
  provideInlayHints(ctx: InlayHintContext): Promise<InlayHintItem[]>
}

function inlayHintTooltip(tooltip: lsp.InlayHint['tooltip']) {
  if (tooltip == null) return null
  return makeBasicMarkdownString(typeof tooltip === 'string' ? tooltip : tooltip.value)
}

export class InlayHintProvider implements IInlayHintProvider {
  constructor(private lspClient: ILSPClient) {}

  async provideInlayHints(ctx: InlayHintContext): Promise<InlayHintItem[]> {
    const lspInlayHints = await this.lspClient.textDocumentInlayHint(
      { signal: ctx.signal },
      {
        textDocument: ctx.textDocument.id,
        range: toLSPRange(ctx.textDocument.getFullRange())
      }
    )
    const result: InlayHintItem[] = []
    if (lspInlayHints == null) return result
    for (const ih of lspInlayHints) {
      const kind = ih.kind ?? lsp.InlayHintKind.Parameter
      if (kind === lsp.InlayHintKind.Parameter && typeof ih.label === 'string') {
        result.push({
          label: ih.label,
          kind: InlayHintKind.Parameter,
          position: fromLSPPosition(ih.position),
          tooltip: inlayHintTooltip(ih.tooltip)
        })
      }
    }
    return result
  }
}
