import { Stage } from './base'
import { StageBackdropsState } from './module_BackdropsEditor'
import { StageWidgetsState } from './module_WidgetsEditor'

export declare class StageState {

  /** The current selection */
  selected: {
    type: 'code'
  } | {
    type: 'widgets'
    state: StageWidgetsState
  } | {
    type: 'backdrops'
    state: StageBackdropsState
  }
  /** Select a target */
  select(type: 'code' | 'widgets' | 'backdrops'): void
  /** Select a target (by specifying route path) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(stage: Stage)
}
