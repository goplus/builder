import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective } from '@/apis/common'
import { enrichCostumeSettings, Facing, genCostumeImage, type CostumeSettings } from '@/apis/aigc'
import type { File } from '../common/file'
import { createFileWithWebUrl, saveFileForWebUrl } from '../common/cloud'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase } from './common'
import { SpriteGen } from './sprite-gen'

// TODO: task cancelation support
/** `CostumeGen` tracks the generation process of a costume. */
export class CostumeGen extends Disposable {
  id: string
  parent: Sprite | SpriteGen
  private get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: Project
  private enrichPhase: Phase<CostumeSettings>
  private generatePhase: Phase<File>

  constructor(parent: Sprite | SpriteGen, project: Project, settings: Partial<CostumeSettings>) {
    super()
    this.id = nanoid()
    this.parent = parent
    this.project = project
    this.enrichPhase = new Phase()
    this.generatePhase = new Phase()
    this.settings = {
      name: '',
      description: '',
      facing: Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null,
      ...settings
    }
    this.result = null
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
    const draft = await this.enrichPhase.run(
      enrichCostumeSettings(
        this.settings.description,
        this.settings,
        getSpriteSettings(this.sprite),
        getProjectSettings(this.project)
      )
    )
    this.setSettings(draft)
  }

  settings: CostumeSettings
  setSettings(updates: Partial<CostumeSettings>) {
    Object.assign(this.settings, updates)
  }

  image: File | null = null
  setImage(file: File) {
    this.image = file
  }

  get generateState() {
    return this.generatePhase.state
  }
  async generate() {
    const defaultCostume = this.sprite.defaultCostume
    if (defaultCostume == null) throw new Error('Sprite has no default costume')
    const referenceImageUrl = await saveFileForWebUrl(defaultCostume.img)
    const image = await this.generatePhase.run(
      genCostumeImage({
        ...this.settings,
        referenceImageUrl
      }).then((url) => createFileWithWebUrl(url))
    )
    this.setImage(image)
  }

  result: Costume | null

  async finish() {
    const image = this.image
    if (image == null) throw new Error('Costume not generated yet')
    const costume = await Costume.create(this.settings.name, image)
    await costume.autoFit()
    this.result = costume
    return costume
  }
}
