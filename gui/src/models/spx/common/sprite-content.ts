import type { SpxProject } from '../project'
import type { Sprite } from '../sprite'
import type { CostumeGen } from '../gen/costume-gen'
import type { AnimationGen } from '../gen/animation-gen'
import type { SpriteContentHistory } from './sprite-content-history'

export type SpriteContentSelected = { type: 'costume' | 'animation'; id: string }

export interface SpriteContent {
  editHistory: SpriteContentHistory
  previewProject: SpxProject
  previewSprite: Sprite
  costumes: CostumeGen[]
  animations: AnimationGen[]
  readonly defaultCostume: CostumeGen | null
  selectedItem: SpriteContentSelected | null
  setSelectedItem(item: SpriteContentSelected | null): void
  getCostumeById(id: string): CostumeGen | null
  getAnimationById(id: string): AnimationGen | null
  getCostumeInstruction(id: string): string
  setCostumeInstruction(id: string, instruction: string): void
  getAnimationInstruction(id: string): string
  setAnimationInstruction(id: string, instruction: string): void
  editCostume(id: string, instruction: string): Promise<void>
  editAnimation(id: string, instruction: string): Promise<void>
  addCostume(): CostumeGen
  removeCostume(id: string): void
  addAnimation(): AnimationGen
  removeAnimation(id: string): void
}
