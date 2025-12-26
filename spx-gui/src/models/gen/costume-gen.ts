import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective } from '@/apis/common'
import { enrichCostumeSettings, Facing, genCostumeImage, type CostumeSettings } from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'
import { createFileWithWebUrl, saveFileForWebUrl } from '../common/cloud'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase } from './common'

// TODO: task cancelation support
/** `CostumeGen` tracks the generation process of a **non-default** costume for a sprite. */
export class CostumeGen extends Disposable {
  id: string
  private sprite: Sprite
  private project: Project
  private enrichPhase: Phase<CostumeSettings>
  private generatePhase: Phase<string>

  constructor(sprite: Sprite, project: Project, settings: Partial<CostumeSettings>) {
    super()
    this.id = nanoid()
    this.sprite = sprite
    this.project = project
    this.enrichPhase = new Phase<CostumeSettings>()
    this.generatePhase = new Phase<string>()
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

  get generateState() {
    return this.generatePhase.state
  }
  async generate() {
    const defaultCostume = this.sprite.defaultCostume
    if (defaultCostume == null) throw new Error('Sprite has no default costume')
    const referenceImageUrl = await saveFileForWebUrl(defaultCostume.img)
    await this.generatePhase.run(
      genCostumeImage({
        ...this.settings,
        referenceImageUrl
      })
    )
  }

  result: Costume | null

  async finish() {
    const generated = this.generateState.result
    if (generated == null) throw new Error('Costume not generated yet')
    const file = createFileWithWebUrl(generated, 'TODO')
    const costume = await Costume.create(this.settings.name, file)
    await costume.autoFit()
    this.result = costume
    return costume
  }
}
