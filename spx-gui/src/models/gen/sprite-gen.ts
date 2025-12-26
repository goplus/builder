import { nanoid } from 'nanoid'
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
  genCostumeImages
} from '@/apis/aigc'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import type { Animation } from '../animation'
import { getProjectSettings, Phase } from './common'
import { CostumeGen } from './costume-gen'
import { AnimationGen } from './animation-gen'
import { createFileWithWebUrl } from '../common/cloud'
import type { File } from '../common/file'
import { getAnimationName, getCostumeName } from '../common/asset-name'

// TODO: task cancelation support
export class SpriteGen extends Disposable {
  id: string
  private project: Project
  private enrichPhase: Phase<SpriteSettings>
  private genImagesPhase: Phase<File[]>
  private prepareContentPhase: Phase<SpriteContentSettings>

  constructor(project: Project, initialDescription = '') {
    super()
    this.id = nanoid()
    this.project = project
    this.enrichPhase = new Phase()
    this.genImagesPhase = new Phase()
    this.prepareContentPhase = new Phase()
    this.costumes = []
    this.animations = []
    this.settings = {
      name: '',
      category: SpriteCategory.Unspecified,
      description: initialDescription,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    }
    this.result = null
    return reactive(this) as this
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.run(
      enrichSpriteSettings(this.settings.description, this.settings, getProjectSettings(this.project))
    )
    this.setSettings(draft)
  }

  settings: SpriteSettings
  setSettings(updates: Partial<SpriteSettings>) {
    Object.assign(this.settings, updates)
  }

  get imagesGenState() {
    return this.genImagesPhase.state
  }
  private getDefaultCostumeSettings(): CostumeSettings {
    const settings = this.settings
    let facing = Facing.Unspecified
    if (settings.perspective === Perspective.SideScrolling) {
      facing = Facing.Right
    } else if (settings.perspective === Perspective.AngledTopDown || settings.perspective === Perspective.TrueTopDown) {
      facing = Facing.Front
    }
    return {
      name: 'default',
      description: `The default costume for sprite "${this.settings.name}". The sprite: ${this.settings.description}`,
      facing,
      artStyle: settings.artStyle,
      perspective: settings.perspective,
      referenceImageUrl: null
    }
  }
  async genImages() {
    return this.genImagesPhase.run(
      genCostumeImages(this.getDefaultCostumeSettings(), 4).then((imgUrls) =>
        imgUrls.map((url) => createFileWithWebUrl(url))
      )
    )
  }

  image: File | null = null
  setImage(file: File) {
    this.image = file
  }

  private sprite: Sprite | null = null
  private ensureSprite() {
    if (this.sprite == null) this.sprite = Sprite.create(this.settings.name)
    return this.sprite
  }

  get contentPreparingState() {
    return this.prepareContentPhase.state
  }
  async prepareContent() {
    if (this.image == null) throw new Error('image expected')
    const image = this.image
    const sprite = this.ensureSprite()
    const project = this.project
    const settings = await this.prepareContentPhase.run(
      (async () => {
        const defaultCostume = await Costume.create('default', image)
        await defaultCostume.autoFit()
        sprite.addCostume(defaultCostume)
        return genSpriteContentSettings(this.settings)
      })()
    )
    this.costumes = settings.costumes.map((s) => new CostumeGen(sprite, project, s))
    this.animations = settings.animations.map((s) => new AnimationGen(sprite, project, s))
  }

  /** Costumes gen other than the default costume */
  costumes: CostumeGen[]
  addCostume() {
    const name = getCostumeName(this)
    const costumeGen = new CostumeGen(this.ensureSprite(), this.project, { name })
    this.costumes.push(costumeGen)
    return costumeGen
  }
  removeCostume(id: string) {
    const index = this.costumes.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Costume with id ${id} not found`)
    const [c] = this.costumes.splice(index, 1)
    c.dispose()
  }
  finishCostume(id: string, costume: Costume) {
    const item = this.costumes.find((c) => c.id === id)
    if (item == null) throw new Error(`Costume ${id} not found`)
    this.ensureSprite().addCostume(costume)
  }

  /** Animations gen */
  animations: AnimationGen[]
  addAnimation() {
    const name = getAnimationName(this)
    const animationGen = new AnimationGen(this.ensureSprite(), this.project, { name })
    this.animations.push(animationGen)
    return animationGen
  }
  removeAnimation(id: string) {
    const index = this.animations.findIndex((a) => a.id === id)
    if (index === -1) throw new Error(`Animation with id ${id} not found`)
    const [a] = this.animations.splice(index, 1)
    a.dispose()
  }
  finishAnimation(id: string, animation: Animation) {
    const item = this.animations.find((a) => a.id === id)
    if (item == null) throw new Error(`Animation ${id} not found`)
    this.ensureSprite().addAnimation(animation)
  }

  result: Sprite | null

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
    this.result = sprite
    return sprite
  }
}
