import { reactive } from 'vue'

import { Disposable } from '@/utils/disposable'
import { ensureValidCostumeName, getAnimationName, validateAnimationName } from './common/asset-name'
import type { Files } from './common/file'
import type { Costume, RawCostumeConfig, Pivot as CostumePivot } from './costume'
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
  id?: string
  /** Duration (in seconds) for animation to be played once */
  duration?: number
  sound?: string
}

export type RawAnimationConfig = {
  builder_id?: string
  frameFrom?: string
  frameTo?: string
  frameFps?: number
  onStart?: ActionConfig

  // legacy APIs, for compatibility only:
  from?: number | string
  to?: number | string
  fps?: number

  // not supported by builder:
  duration?: number
  anitype?: number
  isLoop?: boolean
  onPlay?: ActionConfig
}

export type AnimationExportLoadOptions = {
  sounds: Sound[]
  includeId?: boolean
}

export class Animation extends Disposable {
  id: string

  sprite: Sprite | null = null
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

  costumes: Costume[]
  // For now, detailed methods to manipulate costumes are not needed, we may implement them later
  setCostumes(costumes: Costume[]) {
    for (const costume of costumes) {
      const costumeName = ensureValidCostumeName(costume.name, this)
      costume.setParent(this)
      costume.setName(costumeName)
    }
    this.costumes = costumes
    if (this.duration === 0) {
      this.duration = costumes.length / defaultFps
    }
  }

  applyCostumesPivotChange(dCostumePivot: CostumePivot) {
    for (const c of this.costumes) {
      c.setPivot({
        x: c.pivot.x + dCostumePivot.x,
        y: c.pivot.y + dCostumePivot.y
      })
    }
  }

  /** Duration (in seconds) for animation to be played once */
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
    this.sound = inits?.sound ?? null
    this.id = inits?.id ?? nanoid()

    return reactive(this) as this
  }

  clone(preserveId = false) {
    const animation = new Animation(this.name, {
      id: preserveId ? this.id : undefined,
      duration: this.duration,
      sound: this.sound ?? undefined
    })
    const costumes = this.costumes.map((c) => c.clone(preserveId))
    animation.setCostumes(costumes)
    return animation
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static create(nameBase: string, costumes: Costume[], inits?: AnimationInits) {
    const animation = new Animation(getAnimationName(null, nameBase), inits)
    animation.setCostumes(costumes)
    return animation
  }

  static load(
    name: string,
    {
      builder_id: id,
      frameFrom,
      frameTo,
      frameFps,
      from,
      to,
      fps,
      onStart,
      duration: spxDuration,
      isLoop,
      onPlay,
      anitype
    }: RawAnimationConfig,
    costumes: Costume[],
    { sounds, includeId = true }: AnimationExportLoadOptions
  ): [animation: Animation, animationCostumeNames: string[]] {
    const finalFrom = frameFrom ?? from
    const finalTo = frameTo ?? to
    frameFps = frameFps ?? fps
    if (finalFrom == null || finalTo == null) throw new Error(`from and to expected for Animation ${name}`)
    const fromIndex = getCostumeIndex(costumes, finalFrom)
    const toIndex = getCostumeIndex(costumes, finalTo)
    const animationCostumes = costumes.slice(fromIndex, toIndex + 1).map((c) => c.clone(true))
    const duration = animationCostumes.length / (frameFps ?? defaultFps)
    // drop spx `duration`, which is different from ours
    if (spxDuration != null) console.warn(`unsupported field: duration for animation ${name}`)
    if (isLoop != null) console.warn(`unsupported field: isLoop for animation ${name}`)
    if (onPlay != null) console.warn(`unsupported field: onPlay for animation ${name}`)
    if (anitype != null) console.warn(`unsupported field: anitype for animation ${name}`)
    let soundId: string | undefined = undefined
    if (onStart?.play != null) {
      const sound = sounds.find((s) => s.name === onStart.play)
      if (sound == null) console.warn(`Sound ${onStart.play} not found when creating animation ${name}`)
      else soundId = sound.id
    }
    const animation = new Animation(name, {
      id: includeId ? id : undefined,
      duration,
      sound: soundId
    })
    const animationCostumeNames = animationCostumes.map((c) => c.name)
    for (const costume of animationCostumes) {
      if (costume.name.startsWith(animation.costumeNamePrefix)) {
        costume.setName(costume.name.slice(animation.costumeNamePrefix.length))
      }
    }
    animation.setCostumes(animationCostumes)
    return [animation, animationCostumeNames]
  }

  export(
    /** Path of directory which contains the sprite's config file */
    basePath: string,
    { sounds, includeId = true }: AnimationExportLoadOptions
  ): [RawAnimationConfig, RawCostumeConfig[], Files] {
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const costume of this.costumes) {
      const [costumeConfig, costumeFiles] = costume.export({
        basePath,
        includeId,
        namePrefix: this.costumeNamePrefix
      })
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
