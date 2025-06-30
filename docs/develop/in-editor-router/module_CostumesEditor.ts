import { Costume, Sprite } from './base'

export declare class SpriteCostumesState {

  /** The currently selected costume */
  selected: Costume | null
  /** Select a costume by its ID */
  select(id: string): void
  /** Select a costume by its name */
  selectByName(name: string): void
  /** Select a costume (by specifying route path) */
  selectByRoute(path: string): void
  /** Get route path for the current selection */
  getRoute(): string

  constructor(sprite: Sprite)
}
