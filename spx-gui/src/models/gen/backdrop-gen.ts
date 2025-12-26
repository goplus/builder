import { nanoid } from 'nanoid'
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
  id: string
  private project: Project
  private enrichPhase: Phase<BackdropSettings>
  private generatePhase: Phase<string>

  constructor(project: Project, initialDescription = '') {
    super()
    this.id = nanoid()
    this.project = project
    this.enrichPhase = new Phase<BackdropSettings>()
    this.generatePhase = new Phase<string>()
    this.settings = {
      name: '',
      category: BackdropCategory.Unspecified,
      description: initialDescription,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    }
    return reactive(this) as this
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.run(
      enrichBackdropSettings(this.settings.description, this.settings, getProjectSettings(this.project))
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
