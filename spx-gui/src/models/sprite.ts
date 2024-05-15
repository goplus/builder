/**
 * @file class Sprite
 * @desc Object-model definition for Sprite & Costume
 */

import { reactive } from 'vue'
import { fromText, type Files, fromConfig, toText, toConfig, listDirs, File } from './common/file'
import { Disposble } from './common/disposable'
import { join } from '@/utils/path'
import { type RawCostumeConfig, Costume } from './costume'
import { ensureValidCostumeName, getSpriteName, validateSpriteName } from './common/asset'
import type { Project } from './project'

export enum RotationStyle {
  none = 'none',
  normal = 'normal',
  leftRight = 'left-right'
}

export type SpriteInits = {
  heading?: number
  x?: number
  y?: number
  size?: number
  rotationStyle?: RotationStyle
  costumeIndex?: number
  currentCostumeIndex?: number // For compatibility
  visible?: boolean
  isDraggable?: boolean

  // Not supported by builder:
  fAnimations?: unknown
  mAnimations?: unknown
  tAnimations?: unknown
}

export type RawSpriteConfig = SpriteInits & {
  costumes?: RawCostumeConfig[]
  // Not supported by builder:
  costumeSet?: unknown
  costumeMPSet?: unknown
}

export const spriteAssetPath = 'assets/sprites'

export function getSpriteAssetPath(name: string) {
  return join(spriteAssetPath, name)
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

  private codeFile: File | null
  private get codeFileName() {
    return `${this.name}.spx`
  }
  async getCode() {
    if (this.codeFile == null) return ''
    return toText(this.codeFile)
  }
  setCode(code: string) {
    this.codeFile = fromText(this.codeFileName, code)
  }

  costumes: Costume[]
  costumeIndex: number
  get costume(): Costume | null {
    return this.costumes[this.costumeIndex] ?? null
  }
  setCostumeIndex(costumeIndex: number) {
    this.costumeIndex = costumeIndex
  }
  removeCostume(name: string) {
    const idx = this.costumes.findIndex((s) => s.name === name)
    const [constume] = this.costumes.splice(idx, 1)
    constume.setSprite(null)
  }
  /**
   * Add given costume to sprite.
   * Note: the costume's name may be altered to avoid conflict
   */
  addCostume(costume: Costume) {
    const newCostumeName = ensureValidCostumeName(costume.name, this)
    costume.setName(newCostumeName)
    costume.setSprite(this)
    this.costumes.push(costume)
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

  constructor(name: string, codeFile: File | null = null, inits?: SpriteInits) {
    super()
    this.name = name
    this.codeFile = codeFile
    this.costumes = []
    this.heading = inits?.heading ?? 0
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.size = inits?.size ?? 0
    this.rotationStyle = getRotationStyle(inits?.rotationStyle)
    this.costumeIndex = inits?.costumeIndex ?? inits?.currentCostumeIndex ?? 0
    this.visible = inits?.visible ?? false
    this.isDraggable = inits?.isDraggable ?? false

    for (const field of ['fAnimations', 'mAnimations', 'tAnimations'] as const) {
      if (inits?.[field] != null) console.warn(`unsupported field: ${field} for sprite ${name}`)
    }
    return reactive(this) as this
  }

  /**
   * Adjust position & size to fit current project
   * TODO: review the relation between `autoFit` & `Sprite.create` / `asset2Sprite` / `Project addSprite`
   */
  async autoFit() {
    const { costumes, project: project } = this
    if (project == null) throw new Error('`autoFit` should be called after added to a project')
    if (costumes.length > 0) {
      const [mapSize, costumeSize] = await Promise.all([
        project.stage.getMapSize(),
        costumes[0].getSize()
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
      // ensure the sprite placed in the center of stage, TODO: consider heading
      this.setX((-costumeSize.width * size) / 2)
      this.setY((costumeSize.height * size) / 2)
    }
  }

  /** Create sprite within builder (by user actions) */
  static create(nameBase: string, codeFile?: File, inits?: SpriteInits) {
    return new Sprite(getSpriteName(null, nameBase), codeFile, {
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
      ...inits
    } = (await toConfig(configFile)) as RawSpriteConfig
    const codeFile = files[name + '.spx']
    const sprite = new Sprite(name, codeFile, inits)
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

  export(): Files {
    const assetPath = getSpriteAssetPath(this.name)
    const costumeConfigs: RawCostumeConfig[] = []
    const files: Files = {}
    for (const c of this.costumes) {
      const [costumeConfig, costumeFiles] = c.export(assetPath)
      costumeConfigs.push(costumeConfig)
      Object.assign(files, costumeFiles)
    }
    const config: RawSpriteConfig = {
      heading: this.heading,
      x: this.x,
      y: this.y,
      size: this.size,
      rotationStyle: this.rotationStyle,
      costumeIndex: this.costumeIndex,
      visible: this.visible,
      isDraggable: this.isDraggable,
      costumes: costumeConfigs
    }
    files[this.codeFileName] = this.codeFile ?? fromText(this.codeFileName, '')
    files[`${assetPath}/${spriteConfigFileName}`] = fromConfig(spriteConfigFileName, config)
    return files
  }
}

function getRotationStyle(rotationStyle?: string) {
  if (rotationStyle === 'left-right') return RotationStyle.leftRight
  if (rotationStyle === 'none') return RotationStyle.none
  return RotationStyle.normal
}
