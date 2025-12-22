import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import {
  enrichSpriteSettings,
  type SpriteSettings,
  genSpriteContentSettings,
  type SpriteContentSettings,
  type CostumeSettings,
  Facing,
  type AnimationSettings
} from '@/apis/aigc'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import type { Costume } from '../costume'
import type { Animation } from '../animation'
import { getProjectSettings, Phase } from './common'
import { CostumeGen } from './costume-gen'
import { AnimationGen } from './animation-gen'

export type CostumeItem = {
  settings: CostumeSettings
  gen: CostumeGen | null
  result: Costume | null
}

export type AnimationItem = {
  settings: AnimationSettings
  gen: AnimationGen | null
  result: Animation | null
}

// TODO: task cancelation support
export class SpriteGen extends Disposable {
  private project: Project
  private enrichPhase: Phase<SpriteSettings>
  private generateContentPhase: Phase<SpriteContentSettings>

  constructor(project: Project, input = '') {
    super()
    this.project = project
    this.input = input
    this.enrichPhase = new Phase()
    this.generateContentPhase = new Phase()
    this.costumes = []
    this.animations = []
    this.settings = {
      name: '',
      category: SpriteCategory.Unspecified,
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    }
    return reactive(this) as this
  }

  input: string
  setInput(input: string) {
    this.input = input
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.run(
      enrichSpriteSettings(this.input, undefined, getProjectSettings(this.project))
    )
    this.setSettings(draft)
  }

  settings: SpriteSettings
  setSettings(updates: Partial<SpriteSettings>) {
    Object.assign(this.settings, updates)
  }

  private defaultCostume: CostumeItem | null = null
  genDefaultCostume() {
    const settings = {
      // TODO: better default settings, or get from content-settings generation API
      name: 'default',
      description: 'The default costume for the sprite',
      facing: Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null
    }
    const costumeGen = new CostumeGen(this.ensureSprite(), this.project, this.input)
    costumeGen.setSettings(settings)
    this.defaultCostume = {
      settings,
      gen: costumeGen,
      result: null
    }
    return costumeGen
  }
  finishDefaultCostume(costume: Costume) {
    if (this.defaultCostume == null) throw new Error('Default costume not generated')
    this.defaultCostume.result = costume
    this.ensureSprite().addCostume(costume)
  }

  get generateContentState() {
    return this.generateContentPhase.state
  }
  async generateContent() {
    const descriptions = await this.generateContentPhase.run(genSpriteContentSettings(this.settings))
    this.costumes = descriptions.costumes.map((settings) => ({
      settings,
      gen: null,
      result: null
    }))
    this.animations = descriptions.animations.map((settings) => ({
      settings,
      gen: null,
      result: null
    }))
  }

  private sprite: Sprite | null = null
  private ensureSprite() {
    if (this.sprite == null) this.sprite = Sprite.create(this.settings.name)
    return this.sprite
  }

  costumes: CostumeItem[]
  // TODO: add costume, rename costume
  getCostume(name: string) {
    const item = this.costumes.find((c) => c.settings.name === name)
    return item ?? null
  }
  removeCostume(name: string) {
    this.costumes = this.costumes.filter((c) => c.settings.name !== name)
  }
  genCostume(name: string) {
    const item = this.costumes.find((c) => c.settings.name === name)
    if (item == null) throw new Error(`Costume ${name} not found`)
    const gen = new CostumeGen(this.ensureSprite(), this.project)
    gen.setSettings(item.settings)
    item.gen = gen
    return gen
  }
  finishCostume(name: string, costume: Costume) {
    const item = this.costumes.find((c) => c.settings.name === name)
    if (item == null) throw new Error(`Costume ${name} not found`)
    item.result = costume
    this.ensureSprite().addCostume(costume)
  }

  animations: AnimationItem[]
  // TODO: add animation, rename animation
  getAnimation(name: string) {
    const item = this.animations.find((a) => a.settings.name === name)
    return item ?? null
  }
  removeAnimation(name: string) {
    this.animations = this.animations.filter((a) => a.settings.name !== name)
  }
  genAnimation(name: string) {
    const item = this.animations.find((a) => a.settings.name === name)
    if (item == null) throw new Error(`Animation ${name} not found`)
    const gen = new AnimationGen(this.ensureSprite(), this.project)
    gen.setSettings(item.settings)
    item.gen = gen
    return gen
  }
  finishAnimation(name: string, animation: Animation) {
    const item = this.animations.find((a) => a.settings.name === name)
    if (item == null) throw new Error(`Animation ${name} not found`)
    item.result = animation
    this.ensureSprite().addAnimation(animation)
  }

  finish() {
    const sprite = this.ensureSprite()
    sprite.setAssetMetadata({
      description: this.settings.description,
      extraSettings: {
        category: this.settings.category,
        artStyle: this.settings.artStyle,
        perspective: this.settings.perspective
      }
    })
    this.dispose() // TODO: Is it right to dispose here?
    return sprite
  }
}
