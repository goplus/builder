import { reactive } from 'vue'

import type { Sprite } from './sprite'
import {
  ensureValidCostumeName,
  getAnimationName,
  validateAnimationName
} from './common/asset-name'
import type { Costume, RawCostumeConfig } from './costume'
import type { Files } from './common/file'

enum AniType {
  frame = 0,
  move = 1,
  turn = 2,
  glide = 3
}

type ActionConfig = {
  /** Sound name to play */
  play?: string
  // not supported by builder:
  costumes?: unknown
}

const defaultFps = 25 // TODO

export type AnimationInits = {
  duration?: number
  anitype?: number
  onStart?: ActionConfig

  // not supported by builder:
  fps?: number
  isLoop?: boolean // TODO
  onPlay?: ActionConfig
}

export type RawAnimationConfig = AnimationInits & {
  from?: number | string
  to?: number | string
}

export class Animation {
  private sprite: Sprite | null = null
  setSprite(sprite: Sprite | null) {
    this.sprite = sprite
  }

  name: string
  setName(name: string) {
    const err = validateAnimationName(name, this.sprite)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  private get costumeNamePrefix() {
    // Costumes of animation will be added to sprite's costumes for spx to run,
    // we add prefix for costume name to avoid naming conflict in sprite's costumes.
    // It's important to keep the prefix backward compatible.
    return `__animation_${this.name}_`
  }

  withCostumeNamePrefix(name: string) {
    return this.costumeNamePrefix + name
  }

  private stripCostumeNamePrefix(name: string) {
    if (!name.startsWith(this.costumeNamePrefix)) return name
    return name.slice(this.costumeNamePrefix.length)
  }

  costumes: Costume[]
  // For now, detailed methods to manipulate costumes are not needed, we may implement them later
  setCostumes(costumes: Costume[]) {
    for (const costume of costumes) {
      let costumeName = this.stripCostumeNamePrefix(costume.name)
      costumeName = ensureValidCostumeName(costumeName, this)
      costume.setName(costumeName)
      costume.setParent(this)
    }
    this.costumes = costumes
    if (this.duration == null) {
      this.duration = costumes.length / defaultFps
    }
  }

  duration: number
  setDuration(duration: number) {
    this.duration = duration
  }

  sound: string | null
  setSound(sound: string | null) {
    this.sound = sound
  }

  constructor(name: string, inits?: AnimationInits) {
    this.name = name
    this.costumes = []
    this.duration = inits?.duration ?? 0
    this.sound = inits?.onStart?.play ?? null

    for (const field of ['fps', 'isLoop', 'onPlay'] as const) {
      if (inits?.[field] != null) console.warn(`unsupported field: ${field} for sprite ${name}`)
    }

    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * Note that the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(
    nameBase: string,
    sprite: Sprite,
    costumes: Costume[],
    inits?: AnimationInits
  ) {
    for (const costume of costumes) {
      sprite.removeCostume(costume.name)
    }
    const animation = new Animation(getAnimationName(null, nameBase), inits)
    animation.setCostumes(costumes)
    return animation
  }

  static load(name: string, { from, to, ...inits }: RawAnimationConfig, sprite: Sprite) {
    if (from == null || to == null) throw new Error(`from and to expected for Animation ${name}`)
    const fromIndex = getCostumeIndex(sprite.costumes, from)
    const toIndex = getCostumeIndex(sprite.costumes, to)
    const costumes = sprite.costumes.slice(fromIndex, toIndex + 1)
    for (const costume of costumes) {
      sprite.removeCostume(costume.name)
    }
    const animation = new Animation(name, inits)
    animation.setCostumes(costumes)
    return animation
  }

  export(
    /** Path of directory which contains the sprite's config file */
    basePath: string
  ): [RawAnimationConfig, RawCostumeConfig[], Files] {
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const costume of this.costumes) {
      const [costumeConfig, costumeFiles] = costume.export(basePath)
      costumeConfigs.push(costumeConfig)
      Object.assign(files, costumeFiles)
    }
    const config: RawAnimationConfig = {
      from: costumeConfigs[0]?.name,
      to: costumeConfigs[costumeConfigs.length - 1]?.name,
      duration: this.duration,
      anitype: AniType.frame,
      onStart: this.sound == null ? undefined : { play: this.sound }
    }
    return [config, costumeConfigs, files]
  }
}

function getCostumeIndex(costumes: Costume[], costume: string | number) {
  if (typeof costume === 'number') return costume
  const index = costumes.findIndex((c) => c.name === costume)
  if (index === -1) throw new Error(`costume ${costume} not found`)
  return index
}
