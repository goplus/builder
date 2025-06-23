import { ResourceModel, Sprite } from './base'
import { SpriteAnimationsState } from './module_AnimationsEditor'
import { SpriteCostumesState } from './module_CostumesEditor'

export declare class SpriteState {

  /** The current selection */
  selected: {
    type: 'code'
  } | {
    type: 'costumes'
    state: SpriteCostumesState
  } | {
    type: 'animations'
    state: SpriteAnimationsState
  }
  /** Select a target */
  select(type: 'code' | 'costumes' | 'animations'): void
  /** Select a target (by specifying route path) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(sprite: Sprite)
}
