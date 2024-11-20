import { type Action, type BaseContext, type DefinitionDocumentationString, type Position } from '../common'

export type Hover = {
  contents: DefinitionDocumentationString[]
  actions: Action[]
}

export type HoverContext = BaseContext

export interface IHoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}
