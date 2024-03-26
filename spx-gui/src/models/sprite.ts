/**
 * @file class Sprite
 * @desc Object-model definition for Sprite & Costume
 */

import { reactive } from 'vue'
import { fromText, type Files, fromConfig, toText, toConfig, listDirs } from './common/file'
import { Disposble } from './common/disposable'
import { join } from '@/util/path'
import { type RawCostumeConfig, Costume } from './costume'

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
  visible?: boolean
  isDraggable?: boolean
  // TODO:
  // costumeSet?: costumeSet
  // costumeMPSet?: costumeMPSet
  // currentCostumeIndex?: int
  // fAnimations?: map
  // mAnimations?: map
  // tAnimations?: map
}

export type RawSpriteConfig = SpriteInits & {
  costumes?: RawCostumeConfig[]
}

export const spriteAssetPath = 'assets/sprites'
export const spriteConfigFileName = 'index.json'

export class Sprite extends Disposble {
  name: string
  setName(name: string) {
    this.name = name
  }

  code: string
  setCode(code: string) {
    this.code = code
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
    this.costumes.splice(idx, 1)
  }
  addCostume(costume: Costume) {
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

  constructor(name: string, code: string, costumes: Costume[], inits: SpriteInits) {
    super()
    this.name = name
    this.code = code
    this.costumes = costumes
    // TODO: check default values here
    this.heading = inits.heading ?? 0
    this.x = inits.x ?? 0
    this.y = inits.y ?? 0
    this.size = inits.size ?? 0
    this.rotationStyle = getRotationStyle(inits.rotationStyle)
    this.costumeIndex = inits.costumeIndex ?? 0
    this.visible = inits.visible ?? false
    this.isDraggable = inits.isDraggable ?? false
    return reactive(this)
  }

  static async load(name: string, files: Files) {
    const pathPrefix = join(spriteAssetPath, name)
    const configFile = files[join(pathPrefix, spriteConfigFileName)]
    if (configFile == null) return null
    const { costumes: costumeConfigs, ...inits } = (await toConfig(configFile)) as RawSpriteConfig
    let code = ''
    const codeFile = files[name + '.spx']
    if (codeFile != null) {
      code = await toText(codeFile)
    }
    const costumes = (costumeConfigs ?? []).map((c) => Costume.load(c, files, pathPrefix))
    return new Sprite(name, code, costumes, inits)
  }

  static async loadAll(files: Files) {
    const spriteNames = listDirs(files, spriteAssetPath)
    const sprites: Sprite[] = []
    await Promise.all(
      spriteNames.map(async (spriteName) => {
        const sprite = await Sprite.load(spriteName, files)
        if (sprite == null) {
          console.warn('failed to load sprite:', spriteName)
          return
        }
        sprites.push(sprite)
      })
    )
    return sprites
  }

  export(): Files {
    const assetPath = join(spriteAssetPath, this.name)
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
    files[`${this.name}.spx`] = fromText(`${this.name}.spx`, this.code)
    files[`${assetPath}/${spriteConfigFileName}`] = fromConfig(spriteConfigFileName, config)
    return files
  }
}

function getRotationStyle(rotationStyle?: string) {
  if (rotationStyle === 'left-right') return RotationStyle.leftRight
  if (rotationStyle === 'none') return RotationStyle.none
  return RotationStyle.normal
}
