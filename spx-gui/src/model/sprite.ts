/**
 * @file class Sprite
 * @desc Object-model definition for Sprite & Costume
 */

import { reactive } from 'vue';
import { fromText, type Files, fromConfig, toText, toConfig, listDirs } from './common/file'
import { Disposble } from './common/disposable'
import { join } from '@/util/path'
import { type RawCostumeConfig, Costume } from './costume'
import { assign } from './common';

export enum RotationStyle {
  none = 'none',
  normal = 'normal',
  leftRight = 'left-right'
}

export type SpriteConfig = {
  heading: number
  x: number
  y: number
  size: number
  rotationStyle: RotationStyle
  costumeIndex: number
  visible: boolean
  isDraggable: boolean
  // TODO:
  // costumeSet?: costumeSet
  // costumeMPSet?: costumeMPSet
  // currentCostumeIndex?: int
  // fAnimations?: map
  // mAnimations?: map
  // tAnimations?: map
}

export type RawSpriteConfig = Partial<SpriteConfig> & {
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
  get costume(): Costume | null {
    return this.costumes[this.config.costumeIndex] ?? null
  }
  removeCostume(name: string) {
    const idx = this.costumes.findIndex(s => s.name === name)
    this.costumes.splice(idx, 1)
  }
  addCostume(costume: Costume) {
    this.costumes.push(costume)
  }

  config: SpriteConfig
  setConfig(config: Partial<SpriteConfig>) {
    assign<SpriteConfig>(this.config, config)
  }

  constructor(name: string, code: string, costumes: Costume[], config: Partial<SpriteConfig>) {
    super()
    this.name = name
    this.code = code
    this.costumes = costumes
    this.config = {
      // TODO: check default values here
      heading: config.heading ?? 0,
      x: config.x ?? 0,
      y: config.y ?? 0,
      size: config.size ?? 0,
      rotationStyle: getRotationStyle(config.rotationStyle),
      costumeIndex: config.costumeIndex ?? 0,
      visible: config.visible ?? false,
      isDraggable: config.isDraggable ?? false
    }
    return reactive(this)
  }

  static async load(name: string, files: Files) {
    const configFile = files[join(spriteAssetPath, name, spriteConfigFileName)]
    if (configFile == null) return null
    const { costumes: costumeConfigs, ...config } = await toConfig(configFile) as RawSpriteConfig
    let code = ''
    const codeFile = files[name + '.spx']
    if (codeFile != null) {
      code = await toText(codeFile)
    }
    const costumes = (costumeConfigs ?? []).map(c => Costume.load(c, files))
    return new Sprite(name, code, costumes, config)
  }

  static async loadAll(files: Files) {
    const spriteNames = listDirs(files, spriteAssetPath)
    const sprites: Sprite[] = []
    await Promise.all(spriteNames.map(async spriteName => {
      const sprite = await Sprite.load(spriteName, files)
      if (sprite == null) {
        console.warn('failed to load sprite:', spriteName)
        return
      }
      sprites.push(sprite)
    }))
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
      ...this.config,
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
