import { nanoid } from 'nanoid'
import { reactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { I18n, LocaleMessage } from '@/utils/i18n'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import {
  enrichSpriteSettings,
  type SpriteSettings,
  genSpriteContentSettings,
  type CostumeSettings,
  Facing,
  TaskType,
  adoptAsset
} from '@/apis/aigc'
import { Project } from '../project'
import { RotationStyle, Sprite, State } from '../sprite'
import { Costume } from '../costume'
import type { Animation } from '../animation'
import { getProjectSettings, Phase, Task } from './common'
import { CostumeGen } from './costume-gen'
import { AnimationGen } from './animation-gen'
import { createFileWithUniversalUrl } from '../common/cloud'
import type { File } from '../common/file'
import { getAnimationName, getCostumeName, validateSpriteName } from '../common/asset-name'
import { sprite2Asset } from '../common/asset'

/** User selected item in sprite gen */
type SpriteGenSelected = {
  type: 'costume' | 'animation'
  id: string
}

export class SpriteGen extends Disposable {
  id: string
  private i18n: I18n
  private project: Project
  private enrichPhase: Phase<SpriteSettings>
  private genImagesTask: Task<TaskType.GenerateCostume>
  private genImagesPhase: Phase<File[]>
  private prepareContentPhase: Phase<void>

  constructor(i18n: I18n, project: Project, initialDescription = '') {
    super()
    this.id = nanoid()
    this.i18n = i18n
    this.project = project
    this.enrichPhase = new Phase({ en: 'enrich sprite settings', zh: '丰富角色设置' })
    this.genImagesTask = new Task(TaskType.GenerateCostume)
    this.genImagesPhase = new Phase({ en: 'generate sprite images', zh: '生成角色图片' })
    this.prepareContentPhase = new Phase({ en: 'prepare sprite content', zh: '准备角色内容' })
    this.costumes = []
    this.animations = []
    this.settings = {
      name: '',
      category: SpriteCategory.Unspecified,
      description: initialDescription,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    }
    this.previewProject = new Project()
    this.previewSprite = this.createSprite()
    this.previewProject.addSprite(this.previewSprite)
    this.result = null
    this.addDisposer(() => {
      this.previewProject.dispose()
      this.costumes.forEach((c) => c.dispose())
      this.animations.forEach((a) => a.dispose())
    })
    return reactive(this) as this
  }

  /** Create a sprite instance based on current settings. */
  private createSprite() {
    const { name, perspective } = this.settings
    return Sprite.create(name, '', {
      rotationStyle: rotationStyleForPerspective(perspective)
      // TODO: provide more initial settings when generated
      // e.g., place the pivot at the feet for character sprites in side-scrolling or angled-top-down perspectives.
      // For more details, see: https://github.com/goplus/builder/issues/2785
    })
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateSpriteName(name, this.project)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
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
    const name = this.i18n.t({ en: 'default', zh: '默认' })
    // Append extra description for default costume
    const extraDescription = this.i18n.t(defaultCostumeExtraDescriptions[settings.category])
    const description = [settings.description, extraDescription].filter((s) => s.trim() !== '').join('\n')
    // Determine facing based on sprite category
    let facing = Facing.Front
    if (settings.category === SpriteCategory.Character) {
      facing = Facing.Right
    } else if (settings.category === SpriteCategory.UI) {
      facing = Facing.Unspecified
    }
    return {
      name,
      description,
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
      return imageUrls.map((url) => createFileWithUniversalUrl(url))
    }, this.genImagesTask.runDuration)
  }

  image: File | null = null
  setImage(file: File) {
    this.image = file
  }

  /** The project instance for preview within generation */
  previewProject: Project
  /** The sprite instance for preview within generation */
  previewSprite: Sprite

  private preparePreviewSprite() {
    // Clear existing preview sprite
    if (this.previewSprite != null) {
      // removeSprite will dispose the target sprite, so we don't need to dispose it manually here
      this.previewProject.removeSprite(this.previewSprite.id)
    }

    const sprite = this.createSprite()
    this.previewSprite = sprite
    this.previewProject.addSprite(sprite)
    // Sync results of generations to sprite
    // NOTE: the order of costumes & animations on the sprite may be different
    // from the order of generations, which is acceptable for now.
    sprite.addDisposer(
      watch(
        () => this.costumes.map((c) => c.result).filter((c): c is Costume => c != null),
        (generatedCostumes) => {
          generatedCostumes.forEach((c) => {
            if (!sprite.costumes.includes(c)) sprite.addCostume(c)
          })
          sprite.costumes.slice().forEach((c) => {
            if (!generatedCostumes.includes(c)) sprite.removeCostume(c.id)
          })
        }
      )
    )
    sprite.addDisposer(
      watch(
        () => this.animations.map((a) => a.result).filter((a): a is Animation => a != null),
        (generatedAnimations) => {
          generatedAnimations.forEach((a) => {
            if (!sprite.animations.includes(a)) {
              sprite.addAnimation(a)
              // Auto bind to default state if no bound states
              const boundStates = sprite.getAnimationBoundStates(a.id)
              if (boundStates.length === 0) {
                sprite.setAnimationBoundStates(a.id, [State.Default])
              }
            }
          })
          sprite.animations.slice().forEach((a) => {
            if (!generatedAnimations.includes(a)) sprite.removeAnimation(a.id)
          })
        }
      )
    )
  }

  get isPreparePhase() {
    return this.contentPreparingState.status !== 'finished'
  }

  get contentPreparingState() {
    return this.prepareContentPhase.state
  }
  async prepareContent() {
    const image = this.image
    if (image == null) throw new Error('image expected')
    await this.prepareContentPhase.run(async () => {
      const project = this.project

      // Clear existing costumes & animations
      this.costumes.splice(0).forEach((c) => c.dispose())
      this.animations.splice(0).forEach((a) => a.dispose())

      // Prepare preview sprite
      this.preparePreviewSprite()

      // Generate default costume
      const defaultCostumeGen = new CostumeGen(this, project, this.getDefaultCostumeSettings())
      defaultCostumeGen.setImage(image)
      const defaultCostume = await defaultCostumeGen.finish()
      this.costumes.push(defaultCostumeGen)

      // Generate additional costumes & animations
      const settings = await genSpriteContentSettings(this.settings)
      this.costumes.push(
        ...settings.costumes.map((s) => new CostumeGen(this, project, { ...s, referenceCostumeId: defaultCostume.id }))
      )
      this.animations = settings.animations.map(
        (s) => new AnimationGen(this, project, { ...s, referenceCostumeId: defaultCostume.id })
      )
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
    const defaultCostumeGen = this.defaultCostume
    if (defaultCostumeGen == null) throw new Error('default costume expected')
    const costumeGen = new CostumeGen(this, this.project, {
      name,
      artStyle: this.settings.artStyle,
      perspective: this.settings.perspective,
      facing: defaultCostumeGen.settings.facing,
      referenceCostumeId: defaultCostumeGen.result?.id
    })
    this.costumes.push(costumeGen)
    return costumeGen
  }
  removeCostume(id: string) {
    const index = this.costumes.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Costume with id ${id} not found`)
    if (id === this.defaultCostume?.id) throw new Error('Cannot remove default costume')
    const [c] = this.costumes.splice(index, 1)
    c.cancel()
    c.dispose()
    if (this.selectedItem?.type === 'costume' && this.selectedItem.id === id) {
      this.selectedItem = null
    }
  }
  getCostumeById(id: string): CostumeGen | null {
    return this.costumes.find((c) => c.id === id) ?? null
  }

  /** Animations gen */
  animations: AnimationGen[]
  addAnimation() {
    const name = getAnimationName(this)
    const defaultCostumeGen = this.defaultCostume
    if (defaultCostumeGen == null) throw new Error('default costume expected')
    const animationGen = new AnimationGen(this, this.project, {
      name,
      artStyle: this.settings.artStyle,
      perspective: this.settings.perspective,
      referenceCostumeId: defaultCostumeGen.result?.id
    })
    this.animations.push(animationGen)
    return animationGen
  }
  removeAnimation(id: string) {
    const index = this.animations.findIndex((a) => a.id === id)
    if (index === -1) throw new Error(`Animation with id ${id} not found`)
    const [a] = this.animations.splice(index, 1)
    a.cancel()
    a.dispose()
    if (this.selectedItem?.type === 'animation' && this.selectedItem.id === id) {
      this.selectedItem = null
    }
  }
  getAnimationById(id: string): AnimationGen | null {
    return this.animations.find((a) => a.id === id) ?? null
  }

  result: Sprite | null

  /** Persist the user selected item state across modal sessions */
  selectedItem: SpriteGenSelected | null = null

  setSelectedItem(item: SpriteGenSelected | null) {
    this.selectedItem = item
  }

  finish() {
    const previewSprite = this.previewSprite
    const sprite = this.createSprite()
    for (const gen of this.costumes) {
      if (gen.result == null) continue
      previewSprite.removeCostume(gen.result.id)
      sprite.addCostume(gen.result)
    }
    for (const gen of this.animations) {
      const animation = gen.result
      if (animation == null) continue
      const boundStates = previewSprite.getAnimationBoundStates(animation.id)
      previewSprite.removeAnimation(animation.id)
      sprite.addAnimation(animation)
      sprite.setAnimationBoundStates(animation.id, boundStates)
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

  async recordAdoption() {
    const sprite = this.result
    if (sprite == null) throw new Error('result sprite expected')
    const taskIds = [
      this.genImagesTask.data?.id,
      ...this.costumes.flatMap((c) => c.getTaskIds()),
      ...this.animations.flatMap((a) => a.getTaskIds())
    ].filter((id) => id != null)
    const assetData = await sprite2Asset(sprite)
    const { name: displayName, description, ...extraSettings } = this.settings
    return adoptAsset({
      taskIds,
      asset: {
        ...assetData,
        displayName,
        description,
        extraSettings
      }
    })
  }

  /**
   * Cancel the ongoing generations if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    return Promise.all([
      this.genImagesTask.tryCancel(),
      ...this.costumes.map((c) => c.cancel()),
      ...this.animations.map((a) => a.cancel())
    ])
  }
}

// TODO: consider moving such logic to AIGC backend to colocate all AIGC generation prompts
const defaultCostumeExtraDescriptions: Record<SpriteCategory, LocaleMessage> = {
  [SpriteCategory.Character]: {
    en: 'The character is in an idle state, neutral pose.',
    zh: '角色处于静止状态，采用中立姿势。'
  },
  [SpriteCategory.Item]: {
    en: 'It is used as item or prop in a game.',
    zh: '它被用作游戏中的物品或道具。'
  },
  [SpriteCategory.Effect]: {
    en: 'It is a visual effect element used in a game.',
    zh: '它是游戏中使用的视觉效果元素。'
  },
  [SpriteCategory.UI]: {
    en: 'It is a user interface (UI) element used in a game.',
    zh: '它是游戏中使用的用户界面（UI）元素。'
  },
  [SpriteCategory.Unspecified]: {
    en: '',
    zh: ''
  }
}

function rotationStyleForPerspective(perspective: Perspective): RotationStyle {
  switch (perspective) {
    case Perspective.SideScrolling:
    case Perspective.AngledTopDown:
      return RotationStyle.LeftRight
    case Perspective.Unspecified:
    default:
      return RotationStyle.Normal
  }
}
