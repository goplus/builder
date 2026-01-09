import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { enrichBackdropSettings, TaskType, type BackdropSettings } from '@/apis/aigc'
import type { File } from '../common/file'
import { createFileWithWebUrl } from '../common/cloud'
import type { Project } from '../project'
import { Backdrop } from '../backdrop'
import { getProjectSettings, Phase, Task } from './common'

export class BackdropGen extends Disposable {
  id: string
  private project: Project
  private enrichPhase: Phase<BackdropSettings>
  private generateTask: Task<TaskType.GenerateBackdrop>
  private generatePhase: Phase<File[]>

  constructor(project: Project, initialDescription = '') {
    super()
    this.id = nanoid()
    this.project = project
    this.enrichPhase = new Phase()
    this.generateTask = new Task(TaskType.GenerateBackdrop)
    this.generatePhase = new Phase()
    this.settings = {
      name: '',
      category: BackdropCategory.Unspecified,
      description: initialDescription,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    }
    this.image = null
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
    const draft = await this.enrichPhase.track(
      enrichBackdropSettings(this.settings.description, this.settings, getProjectSettings(this.project))
    )
    this.setSettings(draft)
  }

  settings: BackdropSettings
  setSettings(updates: Partial<BackdropSettings>) {
    Object.assign(this.settings, updates)
  }

  get imagesGenState() {
    return this.generatePhase.state
  }
  genImages() {
    return this.generatePhase.run(async () => {
      await this.generateTask.start({
        settings: this.settings,
        n: 4
      })
      const { imageUrls } = await this.generateTask.untilCompleted()
      // Hardcode .png extension to avoid the cost of `adaptImg` in `Backdrop.create`.
      // TODO: Improve the file type detection in `adaptImg` to avoid this hack.
      return imageUrls.map((url) => createFileWithWebUrl(url, `${this.name}.png`))
    })
  }

  image: File | null
  setImage(file: File) {
    this.image = file
  }

  result: Backdrop | null

  async finish() {
    if (this.image == null) throw new Error('image expected')
    const backdrop = await Backdrop.create(this.settings.name, this.image)
    backdrop.setAssetMetadata({
      description: this.settings.description,
      extraSettings: {
        category: this.settings.category,
        artStyle: this.settings.artStyle,
        perspective: this.settings.perspective
      }
    })
    this.result = backdrop
    return backdrop
  }

  cancel() {
    return this.generateTask.tryCancel()
  }
}
