import { nanoid } from 'nanoid'
import { reactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import {
  enrichSpriteSettings,
  type SpriteSettings,
  genSpriteContentSettings,
  type CostumeSettings,
  Facing,
  TaskType
} from '@/apis/aigc'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import type { Animation } from '../animation'
import { getProjectSettings, Phase, Task } from './common'
import { CostumeGen } from './costume-gen'
import { AnimationGen } from './animation-gen'
import { createFileWithUniversalUrl } from '../common/cloud'
import type { File } from '../common/file'
import { getAnimationName, getCostumeName } from '../common/asset-name'

export class SpriteGen extends Disposable {
  id: string
  private project: Project
  private enrichPhase: Phase<SpriteSettings>
  private genImagesTask: Task<TaskType.GenerateCostume>
  private genImagesPhase: Phase<File[]>
  private prepareContentPhase: Phase<void>

  constructor(project: Project, initialDescription = '') {
    super()
    this.id = nanoid()
    this.project = project
    this.enrichPhase = new Phase()
    this.genImagesTask = new Task(TaskType.GenerateCostume)
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
    this.addDisposer(() => {
      this.costumes.forEach((c) => c.dispose())
      this.animations.forEach((a) => a.dispose())
    })
    return reactive(this) as this
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    // TODO: check name validity
    this.settings.name = name
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.track(
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
    } else if (settings.perspective === Perspective.AngledTopDown) {
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
    return this.genImagesPhase.run(async () => {
      const settings = this.getDefaultCostumeSettings()
      await this.genImagesTask.start({ settings, n: 4 })
      const { imageUrls } = await this.genImagesTask.untilCompleted()
      // Hardcode .png extension to avoid the cost of `adaptImg` in `Costume.create`.
      // TODO: Improve the file type detection in `adaptImg` to avoid this hack.
      return imageUrls.map((url) => createFileWithUniversalUrl(url, `${this.name}.png`)) // TODO: it is actually web url only
    })
  }

  image: File | null = null
  setImage(file: File) {
    this.image = file
  }

  private sprite: Sprite | null = null
  /** The sprite instance for preview within generation */
  get previewSprite() {
    if (this.sprite == null) throw new Error('sprite expected')
    return this.sprite
  }
  private makeSprite() {
    const sprite = Sprite.create(this.settings.name)

    // Sync results of generations to sprite
    // NOTE: the order of costumes & animations on the sprite may be different
    // from the order of generations, which is acceptable for now.
    this.addDisposer(
      watch(
        () => this.costumes.map((c) => c.result).filter((c): c is Costume => c != null),
        (generatedCostumes) => {
          generatedCostumes.forEach((c) => {
            if (!sprite.costumes.includes(c)) sprite.addCostume(c)
          })
          sprite.costumes.slice().forEach((c) => {
            if (!generatedCostumes.includes(c)) sprite.removeCostume(c.id)
          })
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => this.animations.map((a) => a.result).filter((a): a is Animation => a != null),
        (generatedAnimations) => {
          generatedAnimations.forEach((a) => {
            if (!sprite.animations.includes(a)) sprite.addAnimation(a)
          })
          sprite.animations.slice().forEach((a) => {
            if (!generatedAnimations.includes(a)) sprite.removeAnimation(a.id)
          })
        },
        { immediate: true }
      )
    )
    this.addDisposable(sprite)
    this.sprite = sprite
  }

  get contentPreparingState() {
    return this.prepareContentPhase.state
  }
  async prepareContent() {
    const image = this.image
    if (image == null) throw new Error('image expected')
    await this.prepareContentPhase.run(async () => {
      const project = this.project
      this.makeSprite()
      const defaultCostumeGen = new CostumeGen(this, project, this.getDefaultCostumeSettings())
      defaultCostumeGen.setImage(image)
      await defaultCostumeGen.finish()
      this.costumes = [defaultCostumeGen]
      const settings = await genSpriteContentSettings(this.settings)
      this.costumes.push(...settings.costumes.map((s) => new CostumeGen(this, project, s)))
      this.animations = settings.animations.map((s) => new AnimationGen(this, project, s))
    })
  }

  /** Costumes gen */
  costumes: CostumeGen[]
  get defaultCostume() {
    if (this.costumes.length === 0) return null
    return this.costumes[0]
  }
  addCostume() {
    const name = getCostumeName(this)
    const costumeGen = new CostumeGen(this, this.project, { name })
    this.costumes.push(costumeGen)
    return costumeGen
  }
  removeCostume(id: string) {
    const index = this.costumes.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Costume with id ${id} not found`)
    if (id === this.defaultCostume?.id) throw new Error('Cannot remove default costume')
    const [c] = this.costumes.splice(index, 1)
    c.dispose()
  }

  /** Animations gen */
  animations: AnimationGen[]
  addAnimation() {
    const name = getAnimationName(this)
    const animationGen = new AnimationGen(this, this.project, { name })
    this.animations.push(animationGen)
    return animationGen
  }
  removeAnimation(id: string) {
    const index = this.animations.findIndex((a) => a.id === id)
    if (index === -1) throw new Error(`Animation with id ${id} not found`)
    const [a] = this.animations.splice(index, 1)
    a.dispose()
  }

  result: Sprite | null

  finish() {
    const previewSprite = this.sprite
    if (previewSprite == null) throw new Error('sprite expected')
    const sprite = Sprite.create(this.settings.name)
    for (const gen of this.costumes) {
      if (gen.result == null) continue
      previewSprite.removeCostume(gen.result.id)
      sprite.addCostume(gen.result)
    }
    for (const gen of this.animations) {
      if (gen.result == null) continue
      previewSprite.removeAnimation(gen.result.id)
      sprite.addAnimation(gen.result)
    }
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

  cancel() {
    return Promise.all([
      this.genImagesTask.tryCancel(),
      ...this.costumes.map((c) => c.cancel()),
      ...this.animations.map((a) => a.cancel())
    ])
  }
}
