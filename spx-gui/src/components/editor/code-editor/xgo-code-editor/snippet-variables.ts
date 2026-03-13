import type { ITextDocument } from './common'

export type SnippetVariablesContext = {
  textDocument: ITextDocument | null
}

export interface ISnippetVariablesProvider {
  provideSnippetVariables(ctx: SnippetVariablesContext): Record<string, string | null>
}

export class SnippetVariablesProvider implements ISnippetVariablesProvider {
  provideSnippetVariables(_ctx: SnippetVariablesContext): Record<string, string | null> {
    return {}
  }
}
