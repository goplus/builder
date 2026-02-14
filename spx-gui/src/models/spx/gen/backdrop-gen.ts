import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { adoptAsset, enrichBackdropSettings, TaskType, TaskStatus, type BackdropSettings } from '@/apis/aigc'
import type { File } from '../../common/file'
import { createFileWithUniversalUrl } from '../../common/cloud'
import { validateBackdropName } from '../common/asset-name'
import { backdrop2Asset } from '../common/asset'
import type { SpxProject } from '../project'
import { Backdrop } from '../backdrop'
import { getProjectSettings, Phase, Task } from './common'

export class BackdropGen extends Disposable {
  id: string
  private project: SpxProject
  private enrichPhase: Phase<BackdropSettings>
  private generateTask: Task<TaskType.GenerateBackdrop>
  private generatePhase: Phase<File[]>

  constructor(project: SpxProject, initialDescription = '') {
    super()
    this.id = nanoid()
    this.project = project
    this.enrichPhase = new Phase({ en: 'enrich backdrop settings', zh: '丰富背景设置' })
    this.generateTask = new Task(TaskType.GenerateBackdrop)
    this.generatePhase = new Phase({ en: 'generate backdrop images', zh: '生成背景图片' })
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
    const err = validateBackdropName(name, this.project.stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
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
      return imageUrls.map((url) => createFileWithUniversalUrl(url))
    }, this.generateTask.runDuration)
  }

  image: File | null
  setImage(file: File) {
    this.image = file
  }

  get isPreparePhase() {
    return this.result == null
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

  async recordAdoption() {
    const backdrop = this.result
    if (backdrop == null) throw new Error('result backdrop expected')
    const taskIds = this.generateTask.data?.status === TaskStatus.Completed ? [this.generateTask.data.id] : []
    const assetData = await backdrop2Asset(backdrop)
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
   * Cancel the ongoing generation if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    return this.generateTask.tryCancel()
  }
}
