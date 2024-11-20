import { type Action, type BaseContext, type IRange, type Position } from '../common'

export type ContextMenuContext = BaseContext

export type Selection = IRange

export type MenuItem = {
  action: Action
}

export interface IContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}
