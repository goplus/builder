import type { ITextDocument } from './common'

export type SnippetVariablesContext = {
  textDocument: ITextDocument | null
}

export interface ISnippetVariablesProvider {
  provideSnippetVariables(
    ctx: SnippetVariablesContext,
    requestedVariables: readonly string[],
    signal?: AbortSignal
  ): Promise<Record<string, string | null>>
}

export class SnippetVariablesProvider implements ISnippetVariablesProvider {
  async provideSnippetVariables(
    _ctx: SnippetVariablesContext,
    _requestedVariables: readonly string[]
  ): Promise<Record<string, string | null>> {
    return {}
  }
}
