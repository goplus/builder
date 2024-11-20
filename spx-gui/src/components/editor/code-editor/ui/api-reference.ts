import {
  DefinitionKind,
  type BaseContext,
  type Documentation,
  type Position,
  type DefinitionIdentifier
} from '../common'

export type APIReferenceItem = {
  kind: DefinitionKind
  definition: DefinitionIdentifier
  insertText: string
  documentation: Documentation
}

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}
