import { DefinitionKind, type BaseContext, type DefinitionDocumentationString, type Position } from '../common'

export type CompletionContext = BaseContext

export type CompletionItemKind = DefinitionKind

export type CompletionItem = {
  label: string
  kind: CompletionItemKind
  documentation: DefinitionDocumentationString
}

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}
