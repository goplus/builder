import { reactive } from 'vue'

import { Disposable } from '@/utils/disposable'
import {
  ensureValidCostumeName,
  getAnimationName,
  validateAnimationName
} from './common/asset-name'
import type { Files } from './common/file'
import type { Costume, RawCostumeConfig } from './costume'
import type { Sprite } from './sprite'
import { nanoid } from 'nanoid'
import type { Sound } from './sound'

type ActionConfig = {
  /** Sound name to play */
  play?: string
  // not supported by builder:
  costumes?: unknown
}

export const defaultFps = 10

export type AnimationInits = {
  builder_id?: string

  /** Duration for animation to be played once */
  duration?: number
  onStart?: ActionConfig

  // not supported by builder:
  isLoop?: boolean // TODO
  onPlay?: ActionConfig
}

export type RawAnimationConfig = Omit<AnimationInits, 'duration'> & {
  anitype?: number
  frameFrom?: number | string
  frameTo?: number | string
  frameFps?: number

  // legacy APIs, for compatibility only:
  from?: number | string
  to?: number | string
  fps?: number
  duration?: number
}

export class Animation extends Disposable {
  id: string

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
      costume.setParent(this)
      costume.setName(costumeName)
    }
    this.costumes = costumes
    if (this.duration === 0) {
      this.duration = costumes.length / defaultFps
    }
  }

  duration: number
  setDuration(duration: number) {
    this.duration = duration
  }

  sound: string | null
  setSound(soundId: string | null) {
    this.sound = soundId
  }

  constructor(name: string, inits?: AnimationInits) {
    super()
    this.name = name
    this.costumes = []
    this.duration = inits?.duration ?? 0
    this.sound = inits?.onStart?.play ?? null
    this.id = inits?.builder_id ?? nanoid()

    for (const field of ['isLoop', 'onPlay'] as const) {
      if (inits?.[field] != null) console.warn(`unsupported field: ${field} for sprite ${name}`)
    }

    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * Note that the "default" means default behavior for builder, not the default behavior of spx
   */
  static create(nameBase: string, costumes: Costume[], inits?: AnimationInits) {
    const animation = new Animation(getAnimationName(null, nameBase), inits)
    animation.setCostumes(costumes)
    return animation
  }

  static load(
    name: string,
    {
      frameFrom,
      frameTo,
      frameFps,
      from,
      to,
      fps,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      duration: _spxDuration, // drop spx `duration`, which is different from ours
      ...inits
    }: RawAnimationConfig,
    sprite: Sprite,
    sounds: Sound[]
  ) {
    frameFrom = frameFrom ?? from
    frameTo = frameTo ?? to
    frameFps = frameFps ?? fps
    if (frameFrom == null || frameTo == null)
      throw new Error(`from and to expected for Animation ${name}`)
    const fromIndex = getCostumeIndex(sprite.costumes, frameFrom)
    const toIndex = getCostumeIndex(sprite.costumes, frameTo)
    const costumes = sprite.costumes.slice(fromIndex, toIndex + 1)
    const duration = costumes.length / (frameFps ?? defaultFps)
    const soundId =
      inits?.onStart?.play == null ? null : sounds.find((s) => s.name === inits?.onStart?.play)?.id
    if (soundId === undefined) {
      console.warn(`Sound ${inits?.onStart?.play} not found when creating animation ${name}`)
    }
    const animation = new Animation(name, { ...inits, duration })
    animation.setCostumes(costumes.map((costume) => costume.clone()))
    for (const costume of costumes) {
      sprite.removeCostume(costume.id)
    }
    return animation
  }

  export(
    /** Path of directory which contains the sprite's config file */
    {
      basePath,
      sounds,
      includeId = true
    }: { basePath: string; includeId?: boolean; sounds: Sound[] }
  ): [RawAnimationConfig, RawCostumeConfig[], Files] {
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const costume of this.costumes) {
      const [costumeConfig, costumeFiles] = costume.export({ basePath, includeId })
      costumeConfigs.push(costumeConfig)
      Object.assign(files, costumeFiles)
    }
    const config: RawAnimationConfig = {
      frameFrom: costumeConfigs[0]?.name,
      frameTo: costumeConfigs[costumeConfigs.length - 1]?.name,
      frameFps: Math.ceil(this.costumes.length / this.duration)
    }
    const soundName = sounds.find((s) => s.id === this.sound)?.name
    if (soundName) {
      config.onStart = { play: soundName }
    }
    if (includeId) config.builder_id = this.id
    return [config, costumeConfigs, files]
  }
}

function getCostumeIndex(costumes: Costume[], costume: string | number) {
  if (typeof costume === 'number') return costume
  const index = costumes.findIndex((c) => c.name === costume)
  if (index === -1) throw new Error(`costume ${costume} not found`)
  return index
}
