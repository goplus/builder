import { DefinitionKind, type BaseContext, type Documentation, type Position } from '../common'

export type CompletionContext = BaseContext

export type CompletionItemKind = DefinitionKind

export type CompletionItem = {
  label: string
  kind: CompletionItemKind
  documentation: Documentation
}

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}
