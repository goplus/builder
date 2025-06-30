import { Backdrop, Stage } from './base'

export declare class StageBackdropsState {

  /** The current selection */
  selected: Backdrop | null
  /** Select a backdrop by its ID */
  select(id: string): void
  /** Select a backdrop by its name */
  selectByName(name: string): void
  /** Select a backdrop (by specifying route path) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(stage: Stage)
}
