/**
 * @desc AIGC-related APIs of spx-backend
 */

import type { Prettify } from '@/utils/types'
import {
  AnimationLoopMode,
  ArtStyle,
  BackdropCategory,
  client,
  Perspective,
  SoundCategory,
  SpriteCategory
} from './common'

export async function matting(imageUrl: string) {
  const result = (await client.post('/aigc/matting', { imageUrl }, { timeout: 20 * 1000 })) as {
    imageUrl: string
  }
  return result.imageUrl
}

export type ProjectSettings = {
  name: string
  artStyle: ArtStyle
  perspective: Perspective
}

export type SpriteSettingsDraft = {
  name: string
  category: SpriteCategory
  description: string
  artStyle: ArtStyle
  perspective: Perspective
}

export type SpriteSettings = Prettify<
  SpriteSettingsDraft & {
    project: ProjectSettings
  }
>

export const enum Facing {
  Front = 'front',
  Back = 'back',
  Left = 'left',
  Right = 'right'
}

export type CostumeSettingsDraft = {
  name: string
  description: string
  facing: Facing
  artStyle: ArtStyle
  perspective: Perspective
}

export type TODO = unknown

export type CostumeSettings = Prettify<
  CostumeSettingsDraft & {
    referenceImage: TODO
    sprite: SpriteSettings
  }
>

export type AnimationSettingsDraft = {
  name: string
  description: string
  artStyle: ArtStyle
  perspective: Perspective
  loopMode: AnimationLoopMode
}

export type AnimationSettings = Prettify<
  AnimationSettingsDraft & {
    referenceImages: TODO
    sprite: SpriteSettings
  }
>

export type BackdropSettingsDraft = {
  name: string
  category: BackdropCategory
  description: string
  artStyle: ArtStyle
  perspective: Perspective
}

export type BackdropSettings = Prettify<
  BackdropSettingsDraft & {
    project: ProjectSettings
  }
>

export type SoundSettingsDraft = {
  name: string
  category: SoundCategory
  description: string
}

export type SoundSettings = Prettify<
  SoundSettingsDraft & {
    project: ProjectSettings
  }
>
