import { type BaseContext, type Position, type DocumentationItem } from '../common'

export type APIReferenceItem = DocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}
