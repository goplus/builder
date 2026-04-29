/**
 * @desc IInlayHintProvider interface + InlayHintProvider default implementation.
 * Uses ILSPClient. No spx-specific knowledge.
 */

import * as lsp from 'vscode-languageserver-protocol'
import type { BaseContext, Position } from './common'
import { fromLSPPosition, toLSPRange } from './common'
import type { ILSPClient } from './lsp/types'

export enum InlayHintKind {
  Parameter = 2
}

export type InlayHintItem = {
  label: string
  kind: InlayHintKind
  position: Position
}

export type InlayHintContext = BaseContext

export interface IInlayHintProvider {
  provideInlayHints(ctx: InlayHintContext): Promise<InlayHintItem[]>
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
          position: fromLSPPosition(ih.position)
        })
      }
    }
    return result
  }
}
