import { Stage, Widget } from './base'

export declare class StageWidgetsState {

  /** The current selection */
  selected: Widget | null
  /** Select a target (by ID) */
  select(id: string): void
  /** Select a target (by name) */
  selectByName(name: string): void
  /** Select a target (by route) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(stage: Stage)
}
