/**
 * @file class Sprite
 * @desc Object-model definition for Sprite & Costume
 */

import { reactive } from 'vue'
import { nomalizeDegree } from '@/utils/utils'
import { join } from '@/utils/path'
import { Disposable } from '@/utils/disposable'
import { fromText, type Files, fromConfig, toText, toConfig, listDirs } from './common/file'
import {
  ensureValidAnimationName,
  ensureValidCostumeName,
  getSpriteName,
  validateSpriteName
} from './common/asset-name'
import type { AssetMetadata } from './common/asset'
import { type RawCostumeConfig, Costume } from './costume'
import { Animation, type RawAnimationConfig } from './animation'
import type { Project } from './project'
import { nanoid } from 'nanoid'
import type { Sound } from './sound'

export enum RotationStyle {
  none = 'none',
  normal = 'normal',
  leftRight = 'left-right'
}

export enum PhysicsMode {
  KinematicPhysic = 'kinematic',
  DynamicPhysic = 'dynamic',
  StaticPhysic = 'static',
  NoPhysic = 'no'
}

export enum State {
  default = 'default',
  die = 'die',
  step = 'step',
  // not supported by builder:
  turn = 'turn',
  glide = 'glide'
}

export type Pivot = {
  x: number
  y: number
}

export type SpriteInits = {
  id?: string
  heading?: number
  x?: number
  y?: number
  size?: number
  rotationStyle?: string
  costumeIndex?: number
  visible?: boolean
  physicsMode?: PhysicsMode
  isDraggable?: boolean
  animationBindings?: Record<State, string | undefined>
  pivot?: Pivot
  assetMetadata?: AssetMetadata
  /** Additional config not recognized by builder */
  extraConfig?: object
}

export type RawSpriteConfig = Omit<SpriteInits, 'id' | 'animationBindings' | 'assetMetadata' | 'extraConfig'> & {
  builder_id?: string
  builder_assetMetadata?: AssetMetadata
  /** Same as costumeIndex, for compatibility only */
  currentCostumeIndex?: number
  costumes?: RawCostumeConfig[]
  fAnimations?: Record<string, RawAnimationConfig | undefined>
  defaultAnimation?: string
  animBindings?: Record<string, string | undefined>
  // Not supported by builder:
  costumeSet?: unknown
  costumeMPSet?: unknown
  mAnimations?: unknown
  tAnimations?: unknown
}

export const spriteAssetPath = 'assets/sprites'

export function getSpriteAssetPath(name: string) {
  return join(spriteAssetPath, name)
}

function getSpriteCodeFilePath(name: string) {
  return `${name}.spx`
}

export const spriteConfigFileName = 'index.json'

export type SpriteExportLoadOptions = {
  sounds: Sound[]
  includeId?: boolean
  includeCode?: boolean
  includeAssetMetadata?: boolean
}

export class Sprite extends Disposable {
  id: string

  private project: Project | null = null
  setProject(project: Project | null) {
    this.project = project
  }

  name: string
  setName(name: string) {
    const err = validateSpriteName(name, this.project)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  code: string
  setCode(code: string) {
    this.code = code
  }
  get codeFilePath() {
    return getSpriteCodeFilePath(this.name)
  }

  costumes: Costume[]
  private costumeIndex: number
  get defaultCostume(): Costume | null {
    return this.costumes[this.costumeIndex] ?? null
  }
  setDefaultCostume(id: string) {
    const idx = this.costumes.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`costume ${id} not found`)
    this.costumeIndex = idx
  }
  removeCostume(id: string) {
    const idx = this.costumes.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`costume ${id} not found`)
    const [constume] = this.costumes.splice(idx, 1)
    constume.setParent(null)

    // Maintain current costume's index if possible
    if (this.costumeIndex === idx) {
      this.costumeIndex = 0
      // Note that if there is only one costume in the array
      // and it is removed, the index will also be set to 0
    } else if (this.costumeIndex > idx) {
      this.costumeIndex = this.costumeIndex - 1
    }
  }
  /**
   * Add given costume to sprite.
   * NOTE: the costume's name may be altered to avoid conflict
   */
  addCostume(costume: Costume) {
    const newCostumeName = ensureValidCostumeName(costume.name, this)
    costume.setName(newCostumeName)
    costume.setParent(this)
    this.costumes.push(costume)
  }
  /** Move a costume within the costumes array, without changing the default costume */
  moveCostume(from: number, to: number) {
    if (from < 0 || from >= this.costumes.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.costumes.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const costume = this.costumes[from]
    const defaultCostumeId = this.defaultCostume?.id ?? null
    this.costumes.splice(from, 1)
    this.costumes.splice(to, 0, costume)
    if (defaultCostumeId != null) this.setDefaultCostume(defaultCostumeId)
  }

  animations: Animation[]
  removeAnimation(id: string) {
    const idx = this.animations.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`animation ${id} not found`)
    const [animation] = this.animations.splice(idx, 1)
    Object.entries(this.animationBindings).forEach(([state, id]) => {
      if (id === animation.id) this.animationBindings[state as State] = undefined
    })
    animation.setSprite(null)
    animation.dispose()
  }
  /**
   * Add given animation to sprite.
   * NOTE: the animation's name may be altered to avoid conflict
   */
  addAnimation(animation: Animation) {
    const newAnimationName = ensureValidAnimationName(animation.name, this)
    animation.setName(newAnimationName)
    animation.setSprite(this)
    this.animations.push(animation)
  }
  /** Move a animation within the animations array */
  moveAnimation(from: number, to: number) {
    if (from < 0 || from >= this.animations.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.animations.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const animation = this.animations[from]
    this.animations.splice(from, 1)
    this.animations.splice(to, 0, animation)
  }

  private animationBindings: Record<State, string | undefined>
  getAnimationBoundStates(animationId: string) {
    const states: State[] = []
    Object.entries(this.animationBindings).forEach(([state, id]) => {
      if (id === animationId) states.push(state as State)
    })
    return states
  }
  setAnimationBoundStates(
    animationId: string,
    states: State[],
    /** Whether to overwrite existing bindings */
    overwrite: boolean = true
  ) {
    Object.entries(this.animationBindings).forEach(([state, bound]) => {
      if (states.includes(state as State)) {
        if (bound != null && bound !== animationId && !overwrite) return
        this.animationBindings[state as State] = animationId
      } else if (bound === animationId) this.animationBindings[state as State] = undefined
    })
  }
  getDefaultAnimation() {
    return this.animations.find((a) => a.id === this.animationBindings[State.default]) ?? null
  }

  heading: number
  setHeading(heading: number) {
    this.heading = heading
  }

  x: number
  setX(x: number) {
    this.x = x
  }

  y: number
  setY(y: number) {
    this.y = y
  }

  size: number
  setSize(size: number) {
    this.size = size
  }

  rotationStyle: RotationStyle
  setRotationStyle(rotationStyle: RotationStyle) {
    this.rotationStyle = rotationStyle
  }

  physicsMode?: PhysicsMode
  setPhysicsMode(physicsMode: PhysicsMode) {
    this.physicsMode = physicsMode
  }

  visible: boolean
  setVisible(visible: boolean) {
    this.visible = visible
  }

  isDraggable: boolean
  setIsDraggable(isDraggable: boolean) {
    this.isDraggable = isDraggable
  }

  pivot: Pivot
  setPivot(pivot: Pivot) {
    this.pivot = pivot
  }

  assetMetadata: AssetMetadata | null
  setAssetMetadata(metadata: AssetMetadata | null) {
    this.assetMetadata = metadata
  }

  extraConfig: object
  setExtraConfig(extraConfig: object) {
    this.extraConfig = extraConfig
  }

  constructor(name: string, code: string = '', inits?: SpriteInits) {
    super()
    this.name = name
    this.code = code
    this.costumes = []
    this.animations = []
    this.addDisposer(() => {
      this.animations.splice(0).forEach((a) => a.dispose())
    })
    this.animationBindings = inits?.animationBindings ?? {
      [State.default]: undefined,
      [State.die]: undefined,
      [State.step]: undefined,
      [State.turn]: undefined,
      [State.glide]: undefined
    }
    this.heading = inits?.heading ?? 0
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.size = inits?.size ?? 0
    this.rotationStyle = getRotationStyle(inits?.rotationStyle)
    this.physicsMode = inits?.physicsMode
    this.costumeIndex = inits?.costumeIndex ?? 0
    this.visible = inits?.visible ?? false
    this.isDraggable = inits?.isDraggable ?? false
    this.pivot = inits?.pivot ?? { x: 0, y: 0 }
    this.id = inits?.id ?? nanoid()
    this.assetMetadata = inits?.assetMetadata ?? null
    this.extraConfig = inits?.extraConfig ?? {}
    return reactive(this) as this
  }

  randomizePosition() {
    const { project } = this
    if (project == null) throw new Error('`randomizePosition` should be called after added to a project')
    const mapSize = project.stage.getMapSize()
    this.setX(Math.floor(Math.random() * mapSize.width - mapSize.width / 2))
    this.setY(Math.floor(Math.random() * mapSize.height - mapSize.height / 2))
  }

  async clampToMap() {
    const { project, defaultCostume, size, x, y, pivot } = this
    if (project == null) throw new Error('`clampToMap` should be called after added to a project')
    if (defaultCostume != null) {
      const [mapSize, costumeSize] = await Promise.all([project.stage.getMapSize(), defaultCostume.getSize()])
      if (mapSize == null) return
      const halfCostumeWidth = (costumeSize.width * size) / 2
      const halfCostumeHeight = (costumeSize.height * size) / 2
      const visualCenter = {
        x: costumeSize.width / 2,
        y: -costumeSize.height / 2
      }
      /**
       * Meaning of offsetX / offsetY:
       * ------------------------------------
       * When calculating the position of the sprite, the coordinates (x, y)
       * are normally based on the "pivot" (anchor point).
       * But visually we want the sprite to be aligned relative to its
       * "visualCenter" instead.
       *
       * offset is the difference between the visual center
       * and (pivot + costume’s own offset), multiplied by scale (size).
       *
       * In short:
       * - offsetX/offsetY adjust the coordinates so that the visual center
       *   is aligned with the map, not the pivot.
       * - Without this correction, the sprite may appear shifted
       *   because the pivot might not be at the visual center.
       */
      const offsetX = (visualCenter.x - pivot.x - defaultCostume.x) * size
      const offsetY = (visualCenter.y - pivot.y + defaultCostume.y) * size

      const maxX = Math.max(mapSize.width / 2 - halfCostumeWidth, 0)
      const maxY = Math.max(mapSize.height / 2 - halfCostumeHeight, 0)
      this.setX(Math.floor(Math.max(-maxX, Math.min(x, maxX)) - offsetX))
      this.setY(Math.floor(Math.max(-maxY, Math.min(y, maxY)) - offsetY))
    }
  }

  /**
   * Adjust position & size to fit current project
   * TODO: review the relation between `autoFit` & `Sprite.create` / `asset2Sprite` / `Project addSprite`
   */
  async autoFit() {
    const { defaultCostume, project: project } = this
    if (project == null) throw new Error('`autoFit` should be called after added to a project')
    if (defaultCostume != null) {
      const [mapSize, costumeSize] = await Promise.all([project.stage.getMapSize(), defaultCostume.getSize()])
      let size = this.size
      if (mapSize != null) {
        // ensure the sprite's size no larger than half-of-mapSize
        size = Math.min(mapSize.width / 2 / costumeSize.width, mapSize.height / 2 / costumeSize.height, this.size)
        this.setSize(size)
      }
      // ensure the sprite placed in the center of stage
      // TODO: it may be better to keep updating the pivot whenever defaultCostume's size changed.
      // while it introduces extra complexity. In the future we gonna see if it deserves so.
      this.setPivot({ x: costumeSize.width / 2, y: -costumeSize.height / 2 })
      this.setX(0)
      this.setY(0)
    }
  }

  async autoFitCostumes(costumes = this.costumes) {
    await Promise.all(costumes.map((c) => c.autoFit()))
  }

  /** Create sprite within builder (by user actions) */
  static create(nameBase: string, code?: string, inits?: SpriteInits) {
    return new Sprite(getSpriteName(null, nameBase), code, {
      heading: 90,
      x: 0,
      y: 0,
      size: 1,
      visible: true,
      ...inits
    })
  }

  static async load(
    name: string,
    files: Files,
    {
      sounds,
      includeId = true,
      includeCode = true,
      includeAssetMetadata: includeMetadata = true
    }: SpriteExportLoadOptions
  ) {
    const pathPrefix = getSpriteAssetPath(name)
    const configFile = files[join(pathPrefix, spriteConfigFileName)]
    if (configFile == null) return null
    const {
      builder_id: id,
      builder_assetMetadata: metadata,
      currentCostumeIndex,
      costumes: costumeConfigs,
      costumeSet,
      costumeMPSet,
      fAnimations: animationConfigs,
      mAnimations,
      tAnimations,
      defaultAnimation,
      animBindings,
      x,
      y,
      size,
      visible,
      heading,
      rotationStyle,
      physicsMode,
      costumeIndex,
      isDraggable,
      pivot,
      ...extraConfig
    } = (await toConfig(configFile)) as RawSpriteConfig
    let code = ''
    if (includeCode) {
      const codeFile = files[getSpriteCodeFilePath(name)]
      if (codeFile != null) code = await toText(codeFile)
    }

    const costumes: Costume[] = []
    if (costumeConfigs != null) {
      for (const config of costumeConfigs) {
        costumes.push(Costume.load(config, files, { basePath: pathPrefix, includeId }))
      }
    } else {
      if (costumeSet != null) console.warn(`unsupported field: costumeSet for sprite ${name}`)
      else if (costumeMPSet != null) console.warn(`unsupported field: costumeMPSet for sprite ${name}`)
      else console.warn(`no costume found for sprite: ${name}`)
    }

    const animationCostumeSet = new Set<string>()
    const animations: Animation[] = []
    if (animationConfigs != null) {
      for (const [name, config] of Object.entries(animationConfigs)) {
        const [animation, animationCostumes] = Animation.load(name, config!, costumes, { sounds, includeId })
        animations.push(animation)
        for (const c of animationCostumes) animationCostumeSet.add(c)
      }
    }
    if (mAnimations != null) console.warn(`unsupported field: mAnimations for sprite ${name}`)
    if (tAnimations != null) console.warn(`unsupported field: tAnimations for sprite ${name}`)

    const animationNameToId = (name?: string) => name && animations.find((a) => a.name === name)?.id

    const sprite = new Sprite(name, code, {
      x,
      y,
      size,
      visible,
      heading,
      rotationStyle,
      physicsMode,
      isDraggable,
      pivot,
      id: includeId ? id : undefined,
      costumeIndex: costumeIndex ?? currentCostumeIndex,
      animationBindings: {
        [State.default]: animationNameToId(defaultAnimation),
        [State.die]: animationNameToId(animBindings?.[State.die]),
        [State.step]: animationNameToId(animBindings?.[State.step]),
        [State.turn]: animationNameToId(animBindings?.[State.turn]),
        [State.glide]: animationNameToId(animBindings?.[State.glide])
      },
      assetMetadata: includeMetadata ? metadata : undefined,
      extraConfig
    })
    for (const costume of costumes) {
      // If this costume is included by any animation, exclude it from sprite's costume list
      if (animationCostumeSet.has(costume.name)) continue
      sprite.addCostume(costume)
    }
    for (const animation of animations) {
      sprite.addAnimation(animation)
    }
    return sprite
  }

  static async loadAll(files: Files, options: SpriteExportLoadOptions) {
    const spriteNames = listDirs(files, spriteAssetPath)
    const sprites = (
      await Promise.all(
        spriteNames.map(async (spriteName) => {
          const sprite = await Sprite.load(spriteName, files, options)
          if (sprite == null) console.warn('failed to load sprite:', spriteName)
          return sprite
        })
      )
    ).filter((s) => !!s) as Sprite[]
    return sprites
  }

  clone(preserveId = false) {
    const animations = this.animations.map((animation) => animation.clone(preserveId))
    const animBindings = Object.fromEntries(
      Object.entries(this.animationBindings).map(([state, id]) => [
        state,
        this.animations.find((a) => a.id === id)?.name
      ])
    )
    const animationNameToId = (name?: string) => name && animations.find((a) => a.name === name)?.id

    const sprite = new Sprite(this.name, this.code, {
      id: preserveId ? this.id : undefined,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
      heading: this.heading,
      rotationStyle: this.rotationStyle,
      isDraggable: this.isDraggable,
      pivot: this.pivot,
      physicsMode: this.physicsMode,
      costumeIndex: this.costumeIndex,
      animationBindings: {
        [State.default]: animationNameToId(animBindings[State.default]),
        [State.die]: animationNameToId(animBindings[State.die]),
        [State.step]: animationNameToId(animBindings[State.step]),
        [State.turn]: animationNameToId(animBindings[State.turn]),
        [State.glide]: animationNameToId(animBindings[State.glide])
      },
      assetMetadata: this.assetMetadata ?? undefined,
      extraConfig: { ...this.extraConfig }
    })

    for (const costume of this.costumes) {
      sprite.addCostume(costume.clone(preserveId))
    }
    for (const animation of animations) {
      sprite.addAnimation(animation)
    }
    return sprite
  }

  export({
    includeCode = true,
    includeId = true,
    includeAssetMetadata: includeMetadata = true,
    sounds
  }: SpriteExportLoadOptions): Files {
    const assetPath = getSpriteAssetPath(this.name)
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const c of this.costumes) {
      const [costumeConfig, costumeFiles] = c.export({ basePath: assetPath, includeId })
      costumeConfigs.push(costumeConfig)
      Object.assign(files, costumeFiles)
    }
    const animationConfigs: Record<string, RawAnimationConfig> = {}
    for (const a of this.animations) {
      const [animationConfig, animationCostumesConfigs, animationFiles] = a.export(assetPath, { sounds, includeId })
      animationConfigs[a.name] = animationConfig
      costumeConfigs.push(...animationCostumesConfigs)
      Object.assign(files, animationFiles)
    }
    const { [State.default]: defaultAnimationId, ...animBindings } = this.animationBindings
    const defaultAnimationName = this.animations.find((a) => a.id === defaultAnimationId)?.name
    if (defaultAnimationId && defaultAnimationName == null)
      console.warn('default animation', defaultAnimationId, 'not found for sprite:', this.name)
    const animationBindingsNames = Object.entries(animBindings).reduce<Record<string, string | undefined>>(
      (acc, [state, id]) => {
        const name = this.animations.find((a) => a.id === id)?.name
        if (id && name == null) {
          console.warn('animation', id, 'not found for sprite:', this.name)
        }
        acc[state] = name
        return acc
      },
      {}
    )
    const config: RawSpriteConfig = {
      heading: this.heading,
      x: this.x,
      y: this.y,
      size: this.size,
      rotationStyle: this.rotationStyle,
      physicsMode: this.physicsMode,
      costumeIndex: this.costumeIndex,
      visible: this.visible,
      isDraggable: this.isDraggable,
      pivot: this.pivot,
      costumes: costumeConfigs,
      fAnimations: animationConfigs,
      defaultAnimation: defaultAnimationName,
      animBindings: animationBindingsNames,
      ...this.extraConfig
    }
    if (includeCode) {
      const codeFilePath = getSpriteCodeFilePath(this.name)
      files[codeFilePath] = fromText(codeFilePath, this.code)
    }
    if (includeId) config.builder_id = this.id
    if (includeMetadata && this.assetMetadata != null) config.builder_assetMetadata = this.assetMetadata
    files[`${assetPath}/${spriteConfigFileName}`] = fromConfig(spriteConfigFileName, config)
    return files
  }
}

function getRotationStyle(rotationStyle?: string) {
  if (rotationStyle === 'left-right') return RotationStyle.leftRight
  if (rotationStyle === 'none') return RotationStyle.none
  return RotationStyle.normal
}

export enum LeftRight {
  left = 'left',
  right = 'right'
}

export function headingToLeftRight(heading: number): LeftRight {
  heading = nomalizeDegree(heading)
  if (heading >= 0) return LeftRight.right
  return LeftRight.left
}

export function leftRightToHeading(leftRight: LeftRight) {
  return leftRight === LeftRight.right ? 90 : -90
}
