import { Project, ResourceModel, Router, Runtime, Sound, Sprite } from './base'
import { SpriteState } from './module_SpriteEditor'
import { StageState } from './module_StageEditor'

export declare class EditorState {

  /** The current selection */
  selected: {
    type: 'stage'
    state: StageState
  } | {
    type: 'sprite'
    sprite: Sprite
    state: SpriteState
  } | {
    type: 'sound'
    sound: Sound
  } | null

  /** Select a target (by ID) */
  select(target: { type: 'stage' } | { type: 'sprite'; id: string } | { type: 'sound'; id: string }): void
  /** Select a target (by name) */
  selectByName(target: { type: 'stage' } | { type: 'sprite'; name: string } | { type: 'sound'; name: string }): void
  /** Select given resource */
  selectByResource(target: ResourceModel): void

  runtime: Runtime

  constructor(project: Project, router: Router)

}
