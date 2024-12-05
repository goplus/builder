import { type Action, type BaseContext, type Range, type Position } from '../common'

export type ContextMenuContext = BaseContext

export type Selection = Range

export type MenuItem = {
  action: Action
}

export interface IContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}
