import type { ITextDocument } from './common'

export type SnippetVariablesContext = {
  textDocument: ITextDocument | null
  signal: AbortSignal
}

export interface ISnippetVariablesProvider {
  provideSnippetVariables(ctx: SnippetVariablesContext): Promise<Record<string, string | null>>
}

export class SnippetVariablesProvider implements ISnippetVariablesProvider {
  async provideSnippetVariables(_ctx: SnippetVariablesContext): Promise<Record<string, string | null>> {
    return {}
  }
}
