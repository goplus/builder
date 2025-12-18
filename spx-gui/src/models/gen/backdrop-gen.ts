import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { enrichBackdropSettings, genBackdropImage, type BackdropSettings } from '@/apis/aigc'
import type { Project } from '../project'
import { Backdrop } from '../backdrop'
import { createFileWithWebUrl } from '../common/cloud'
import { getProjectSettings, Phase } from './common'

// TODO: task cancelation support
export class BackdropGen extends Disposable {
  private project: Project
  private enrichPhase: Phase<BackdropSettings>
  private generatePhase: Phase<string>

  constructor(project: Project, input = '') {
    super()
    this.project = project
    this.input = input
    this.enrichPhase = new Phase<BackdropSettings>()
    this.generatePhase = new Phase<string>()
    this.settings = {
      name: '',
      category: BackdropCategory.Unspecified,
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
      enrichBackdropSettings(this.input, undefined, getProjectSettings(this.project))
    )
    this.setSettings(draft)
  }

  settings: BackdropSettings
  setSettings(updates: Partial<BackdropSettings>) {
    Object.assign(this.settings, updates)
  }

  get generateState() {
    return this.generatePhase.state
  }
  async generate() {
    await this.generatePhase.run(genBackdropImage(this.settings))
  }

  async finish() {
    const generated = this.generateState.result
    if (generated == null) throw new Error('Backdrop not generated yet')
    const file = createFileWithWebUrl(generated, 'TODO')
    const backdrop = await Backdrop.create(this.settings.name, file)
    backdrop.setAssetMetadata({
      description: this.settings.description,
      extraSettings: {
        category: this.settings.category,
        artStyle: this.settings.artStyle,
        perspective: this.settings.perspective
      }
    })
    this.dispose() // TODO: Is it right to dispose here?
    return backdrop
  }
}
