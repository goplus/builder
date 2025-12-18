import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective } from '@/apis/common'
import { enrichCostumeSettings, Facing, genCostumeImage, type CostumeSettings } from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'
import { createFileWithWebUrl } from '../common/cloud'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase } from './common'

type SettingsInput = Prettify<Omit<CostumeSettings, 'sprite'>>

// TODO: task cancelation support
export class CostumeGen extends Disposable {
  private sprite: Sprite
  private project: Project
  private enrichPhase: Phase<CostumeSettings>
  private generatePhase: Phase<string>

  constructor(sprite: Sprite, project: Project, input = '') {
    super()
    this.sprite = sprite
    this.project = project
    this.input = input
    this.enrichPhase = new Phase<CostumeSettings>()
    this.generatePhase = new Phase<string>()
    this.settings = {
      name: '',
      description: '',
      facing: Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null
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
      enrichCostumeSettings(this.input, undefined, getSpriteSettings(this.sprite), getProjectSettings(this.project))
    )
    this.setSettings({
      ...draft,
      referenceImageUrl: null // TODO: use default costume (if exists) as reference image
    })
  }

  settings: SettingsInput
  setSettings(updates: Partial<SettingsInput>) {
    Object.assign(this.settings, updates)
  }

  get generateState() {
    return this.generatePhase.state
  }
  async generate() {
    await this.generatePhase.run(genCostumeImage(this.settings))
  }

  async finish() {
    const generated = this.generateState.result
    if (generated == null) throw new Error('Costume not generated yet')
    const file = createFileWithWebUrl(generated, 'TODO')
    const costume = await Costume.create(this.settings.name, file)
    await costume.autoFit()
    this.dispose() // TODO: Is it right to dispose here?
    return costume
  }
}
