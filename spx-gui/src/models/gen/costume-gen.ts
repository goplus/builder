import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ArtStyle, Perspective } from '@/apis/common'
import { enrichCostumeSettings, Facing, TaskType, type CostumeSettings } from '@/apis/aigc'
import type { File } from '../common/file'
import { validateCostumeName } from '../common/asset-name'
import { createFileWithUniversalUrl, saveFile } from '../common/cloud'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase, Task } from './common'
import { SpriteGen } from './sprite-gen'

/** `CostumeGen` tracks the generation process of a costume. */
export class CostumeGen extends Disposable {
  id: string
  parent: Sprite | SpriteGen
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: Project
  private enrichPhase: Phase<CostumeSettings>
  private generateTask: Task<TaskType.GenerateCostume>
  private generatePhase: Phase<File>
  private finishPhase: Phase<Costume>

  constructor(parent: Sprite | SpriteGen, project: Project, settings: Partial<CostumeSettings>) {
    super()
    this.id = nanoid()
    this.parent = parent
    this.project = project
    this.enrichPhase = new Phase({ en: 'enrich costume settings', zh: '丰富造型设置' })
    this.generateTask = new Task(TaskType.GenerateCostume)
    this.generatePhase = new Phase({ en: 'generate costume image', zh: '生成造型图片' })
    this.finishPhase = new Phase({ en: 'save costume', zh: '保存造型' })
    this.settings = {
      name: '',
      description: '',
      facing: Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null,
      ...settings
    }
    this.referenceCostumeId = this.sprite.defaultCostume?.id ?? null
    return reactive(this) as this
  }

  getTaskIds() {
    if (this.generateTask.data == null) return []
    return [this.generateTask.data.id]
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateCostumeName(name, this.sprite)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.settings.name = name
    this.result?.setName(name)
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.track(
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

  private referenceCostumeId: string | null
  get referenceCostume() {
    const id = this.referenceCostumeId
    if (id == null) return null
    return this.sprite.costumes.find((c) => c.id === id) ?? null
  }
  setReferenceCostume(costumeId: string | null) {
    this.referenceCostumeId = costumeId
  }

  image: File | null = null
  setImage(file: File | null) {
    this.image = file
  }

  get generateState() {
    return this.generatePhase.state
  }
  async generate() {
    this.setImage(null)
    const image = await this.generatePhase.run(async () => {
      const referenceCostume = this.referenceCostume
      const referenceImageUrl = referenceCostume != null ? await saveFile(referenceCostume.img) : null
      const settings = { ...this.settings, referenceImageUrl }
      await this.generateTask.start({ settings, n: 1 })
      const { imageUrls } = await this.generateTask.untilCompleted()
      if (imageUrls.length < 1) throw new Error('no costume image generated')
      return createFileWithUniversalUrl(imageUrls[0])
    })
    this.setImage(image)
  }

  get finishState() {
    return this.finishPhase.state
  }
  get result() {
    return this.finishPhase.state.result
  }
  resetFinishState() {
    this.finishPhase.reset()
  }

  async finish() {
    const image = this.image
    if (image == null) throw new Error('Costume not generated yet')
    return this.finishPhase.run(async () => {
      const costume = await Costume.create(this.settings.name, image)
      await costume.autoFit()
      return costume
    })
  }

  cancel() {
    return this.generateTask.tryCancel()
  }
}
