import type { ITextDocument, BaseContext } from './common'

export type SnippetVariablesContext = BaseContext & {
  textDocument: ITextDocument | null
}

export interface ISnippetVariablesProvider {
  provideSnippetVariables(ctx: SnippetVariablesContext): Promise<Record<string, string | null>>
}

export class SnippetVariablesProvider implements ISnippetVariablesProvider {
  async provideSnippetVariables(_ctx: SnippetVariablesContext): Promise<Record<string, string | null>> {
    return {}
  }
}
