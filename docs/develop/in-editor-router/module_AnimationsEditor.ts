import { Sprite } from './base'

export declare class SpriteAnimationsState {

  /** The currently selected animation */
  selected: Animation | null
  /** Select a target (by ID) */
  select(id: string): void
  /** Select a target (by name) */
  selectByName(name: string): void
  /** Select a target (by specifying route path) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(sprite: Sprite)
}
