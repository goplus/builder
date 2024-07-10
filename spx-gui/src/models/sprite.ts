/**
 * @file class Sprite
 * @desc Object-model definition for Sprite & Costume
 */

import { reactive, watch } from 'vue'
import { nomalizeDegree } from '@/utils/utils'
import { join } from '@/utils/path'
import { fromText, type Files, fromConfig, toText, toConfig, listDirs } from './common/file'
import { Disposble } from './common/disposable'
import {
  ensureValidAnimationName,
  ensureValidCostumeName,
  getSpriteName,
  validateSpriteName
} from './common/asset-name'
import { type RawCostumeConfig, Costume } from './costume'
import { Animation, type RawAnimationConfig } from './animation'
import type { Project } from './project'

export enum RotationStyle {
  none = 'none',
  normal = 'normal',
  leftRight = 'left-right'
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
  heading?: number
  x?: number
  y?: number
  size?: number
  rotationStyle?: string
  costumeIndex?: number
  currentCostumeIndex?: number // For compatibility
  visible?: boolean
  isDraggable?: boolean
  defaultAnimation?: string
  animBindings?: Record<string, string | undefined>
  pivot?: Pivot
}

export type RawSpriteConfig = SpriteInits & {
  costumes?: RawCostumeConfig[]
  fAnimations?: Record<string, RawAnimationConfig | undefined>
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

function getSpriteCodeFileName(name: string) {
  return `${name}.spx`
}

export const spriteConfigFileName = 'index.json'

export class Sprite extends Disposble {
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

  costumes: Costume[]
  private costumeIndex: number
  get defaultCostume(): Costume | null {
    return this.costumes[this.costumeIndex] ?? null
  }
  setDefaultCostume(name: string) {
    const idx = this.costumes.findIndex((s) => s.name === name)
    if (idx === -1) throw new Error(`costume ${name} not found`)
    this.costumeIndex = idx
  }
  removeCostume(name: string) {
    const idx = this.costumes.findIndex((s) => s.name === name)
    if (idx === -1) throw new Error(`costume ${name} not found`)
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
   * Note: the costume's name may be altered to avoid conflict
   */
  addCostume(costume: Costume) {
    const newCostumeName = ensureValidCostumeName(costume.name, this)
    costume.setName(newCostumeName)
    costume.setParent(this)
    this.costumes.push(costume)
  }

  animations: Animation[]
  removeAnimation(name: string) {
    const idx = this.animations.findIndex((s) => s.name === name)
    if (idx === -1) throw new Error(`animation ${name} not found`)
    const [animation] = this.animations.splice(idx, 1)
    animation.setSprite(null)
    animation.dispose()
  }
  /**
   * Add given animation to sprite.
   * Note: the animation's name may be altered to avoid conflict
   */
  addAnimation(animation: Animation) {
    const newAnimationName = ensureValidAnimationName(animation.name, this)
    animation.setName(newAnimationName)
    animation.setSprite(this)
    animation.addDisposer(() => animation.setSprite(null))
    this.animations.push(animation)
    animation.addDisposer(
      // update animationBindings when sprite renamed
      watch(
        () => animation.name,
        (newName, originalName) => {
          Object.entries(this.animationBindings).forEach(([state, name]) => {
            if (name === originalName) this.animationBindings[state as State] = newName
          })
        }
      )
    )
    animation.addDisposer(() => {
      Object.entries(this.animationBindings).forEach(([state, name]) => {
        if (name === animation.name) this.animationBindings[state as State] = undefined
      })
    })
  }

  private animationBindings: Record<State, string | undefined>
  getAnimationBoundStates(animationName: string) {
    const states: State[] = []
    Object.entries(this.animationBindings).forEach(([state, name]) => {
      if (name === animationName) states.push(state as State)
    })
    return states
  }
  setAnimationBoundStates(animationName: string, states: State[]) {
    Object.entries(this.animationBindings).forEach(([state, bound]) => {
      if (states.includes(state as State)) this.animationBindings[state as State] = animationName
      else if (bound === animationName) this.animationBindings[state as State] = undefined
    })
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

  constructor(name: string, code: string = '', inits?: SpriteInits) {
    super()
    this.name = name
    this.code = code
    this.costumes = []
    this.animations = []
    this.animationBindings = {
      [State.default]: inits?.defaultAnimation,
      [State.die]: inits?.animBindings?.[State.die],
      [State.step]: inits?.animBindings?.[State.step],
      [State.turn]: inits?.animBindings?.[State.turn],
      [State.glide]: inits?.animBindings?.[State.glide]
    }
    this.heading = inits?.heading ?? 0
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.size = inits?.size ?? 0
    this.rotationStyle = getRotationStyle(inits?.rotationStyle)
    this.costumeIndex = inits?.costumeIndex ?? inits?.currentCostumeIndex ?? 0
    this.visible = inits?.visible ?? false
    this.isDraggable = inits?.isDraggable ?? false
    this.pivot = inits?.pivot ?? { x: 0, y: 0 }
    return reactive(this) as this
  }

  /**
   * Adjust position & size to fit current project
   * TODO: review the relation between `autoFit` & `Sprite.create` / `asset2Sprite` / `Project addSprite`
   */
  async autoFit() {
    const { defaultCostume, project: project } = this
    if (project == null) throw new Error('`autoFit` should be called after added to a project')
    if (defaultCostume != null) {
      const [mapSize, costumeSize] = await Promise.all([
        project.stage.getMapSize(),
        defaultCostume.getSize()
      ])
      let size = this.size
      if (mapSize != null) {
        // ensure the sprite's size no larger than half-of-mapSize
        size = Math.min(
          mapSize.width / 2 / costumeSize.width,
          mapSize.height / 2 / costumeSize.height,
          this.size
        )
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

  static async load(name: string, files: Files) {
    const pathPrefix = getSpriteAssetPath(name)
    const configFile = files[join(pathPrefix, spriteConfigFileName)]
    if (configFile == null) return null
    const {
      costumes: costumeConfigs,
      costumeSet,
      costumeMPSet,
      fAnimations: animationConfigs,
      mAnimations,
      tAnimations,
      ...inits
    } = (await toConfig(configFile)) as RawSpriteConfig
    const codeFile = files[getSpriteCodeFileName(name)]
    const code = codeFile != null ? await toText(codeFile) : ''
    const sprite = new Sprite(name, code, inits)
    if (costumeConfigs != null) {
      const costumes = (costumeConfigs ?? []).map((c) => Costume.load(c, files, pathPrefix))
      for (const costume of costumes) {
        sprite.addCostume(costume)
      }
    } else {
      if (costumeSet != null) console.warn(`unsupported field: costumeSet for sprite ${name}`)
      else if (costumeMPSet != null)
        console.warn(`unsupported field: costumeMPSet for sprite ${name}`)
      else console.warn(`no costume found for sprite: ${name}`)
    }
    if (animationConfigs != null) {
      const animations = Object.entries(animationConfigs).map(([name, config]) =>
        Animation.load(name, config!, sprite)
      )
      for (const animation of animations) {
        sprite.addAnimation(animation)
      }
    }
    if (mAnimations != null) console.warn(`unsupported field: mAnimations for sprite ${name}`)
    if (tAnimations != null) console.warn(`unsupported field: tAnimations for sprite ${name}`)
    return sprite
  }

  static async loadAll(files: Files) {
    const spriteNames = listDirs(files, spriteAssetPath)
    const sprites = (
      await Promise.all(
        spriteNames.map(async (spriteName) => {
          const sprite = await Sprite.load(spriteName, files)
          if (sprite == null) console.warn('failed to load sprite:', spriteName)
          return sprite
        })
      )
    ).filter((s) => !!s) as Sprite[]
    return sprites
  }

  export(includeCode = true): Files {
    const assetPath = getSpriteAssetPath(this.name)
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const c of this.costumes) {
      const [costumeConfig, costumeFiles] = c.export(assetPath)
      costumeConfigs.push(costumeConfig)
      Object.assign(files, costumeFiles)
    }
    const animationConfigs: Record<string, RawAnimationConfig> = {}
    for (const a of this.animations) {
      const [animationConfig, animationCostumesConfigs, animationFiles] = a.export(assetPath)
      animationConfigs[a.name] = animationConfig
      costumeConfigs.push(...animationCostumesConfigs)
      Object.assign(files, animationFiles)
    }
    const { [State.default]: defaultAnimation, ...animBindings } = this.animationBindings
    const config: RawSpriteConfig = {
      heading: this.heading,
      x: this.x,
      y: this.y,
      size: this.size,
      rotationStyle: this.rotationStyle,
      costumeIndex: this.costumeIndex,
      visible: this.visible,
      isDraggable: this.isDraggable,
      pivot: this.pivot,
      costumes: costumeConfigs,
      fAnimations: animationConfigs,
      defaultAnimation: defaultAnimation,
      animBindings: animBindings
    }
    if (includeCode) {
      const codeFileName = getSpriteCodeFileName(this.name)
      files[codeFileName] = fromText(codeFileName, this.code)
    }
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
