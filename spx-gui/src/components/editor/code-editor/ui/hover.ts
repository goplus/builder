import { type Action, type BaseContext, type Documentation, type Position } from '../common'

export type Hover = {
  contents: Documentation[]
  actions: Action[]
}

export type HoverContext = BaseContext

export interface IHoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}
