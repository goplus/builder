import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { extname } from '@/utils/path'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { ArtStyle, Perspective } from '@/apis/common'
import {
  enrichCostumeSettings,
  Facing,
  isTerminalTaskStatus,
  TaskType,
  TaskStatus,
  type CostumeSettings
} from '@/apis/aigc'
import type { File, Files } from '../../common/file'
import { ensureValidCostumeName, validateCostumeName } from '../common/asset-name'
import { createFileWithUniversalUrl, saveFile } from '../../common/cloud'
import type { SpxProject } from '../project'
import { Sprite } from '../sprite'
import { Costume, type RawCostumeConfig } from '../costume'
import {
  getProjectSettings,
  getSpriteSettings,
  mapPhaseResult,
  Phase,
  Task,
  type PhaseSerialized,
  type TaskSerialized
} from './common'
import { SpriteGen } from './sprite-gen'

export type CostumeGenInits = {
  id?: string
  settings?: Partial<Omit<CostumeSettings, 'referenceImageUrl'>>
  referenceCostumeId?: string
  image?: File
  enrichPhase?: Phase<CostumeSettings>
  generateTask?: Task<TaskType.GenerateCostume>
  generatePhase?: Phase<File>
  finishPhase?: Phase<Costume>
}

export type RawCostumeGenConfig = Prettify<
  Omit<CostumeGenInits, 'result' | 'enrichPhase' | 'generateTask' | 'generatePhase' | 'finishPhase' | 'image'> & {
    imagePath?: string
    enrichPhaseSerialized?: PhaseSerialized<CostumeSettings>
    generateTaskSerialized?: TaskSerialized<TaskType.GenerateCostume>
    generatePhaseSerialized?: PhaseSerialized<string>
    finishPhaseSerialized?: PhaseSerialized<RawCostumeConfig>
  }
>

function assetsPathFor(basePath: string, name: string) {
  return `${basePath}/costumes/${name}`
}

/** `CostumeGen` tracks the generation process of a costume. */
export class CostumeGen extends Disposable {
  id: string
  private i18n: I18n
  parent: Sprite | SpriteGen
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: SpxProject
  private enrichPhase: Phase<CostumeSettings>
  private generateTask: Task<TaskType.GenerateCostume> | null
  private generatePhase: Phase<File>
  private finishPhase: Phase<Costume>

  constructor(i18n: I18n, parent: Sprite | SpriteGen, project: SpxProject, inits: CostumeGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.i18n = i18n
    this.parent = parent
    this.project = project
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich costume settings', zh: '丰富造型设置' })
    this.generateTask = inits.generateTask ?? null
    this.generatePhase = inits.generatePhase ?? new Phase({ en: 'generate costume image', zh: '生成造型图片' })
    this.finishPhase = inits.finishPhase ?? new Phase({ en: 'save costume', zh: '保存造型' })
    this.settings = {
      name: '',
      description: '',
      facing: Facing.Unspecified,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null,
      ...inits.settings
    }
    this.referenceCostumeId = inits.referenceCostumeId ?? null
    this.image = inits.image ?? null
    return reactive(this) as this
  }

  /** Get IDs for (completed) tasks. */
  getTaskIds() {
    if (this.generateTask?.data?.status !== TaskStatus.Completed) return []
    return [this.generateTask.data.id]
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateCostumeName(name, this.parent)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.settings.name = name
    this.result?.setName(name)
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const enriched = await this.enrichPhase.track(
      enrichCostumeSettings(
        this.settings.description,
        this.settings,
        getSpriteSettings(this.sprite),
        getProjectSettings(this.project),
        this.i18n.lang.value
      )
    )
    this.setSettings(enriched)
  }

  settings: CostumeSettings
  /**
   * Update multiple settings at once.
   * NOTE: the name in updates may be altered to avoid conflict
   */
  setSettings(updates: Partial<CostumeSettings>) {
    if (updates.name != null && updates.name !== this.settings.name) {
      const newName = ensureValidCostumeName(updates.name, this.parent)
      updates = { ...updates, name: newName }
    }
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
    const image = await this.generatePhase.run(async (reporter) => {
      const referenceCostume = this.referenceCostume
      const referenceImageUrl = referenceCostume != null ? await saveFile(referenceCostume.img) : null
      const settings = { ...this.settings, referenceImageUrl }
      this.generateTask?.tryCancel()
      this.generateTask = new Task(TaskType.GenerateCostume)
      await this.generateTask.start({ settings, n: 1 })
      const { imageUrls } = await this.generateTask.untilCompleted(reporter)
      if (imageUrls.length < 1) throw new Error('no costume image generated')
      return createFileWithUniversalUrl(imageUrls[0])
    })
    this.setImage(image)
  }
  async restoreGenerateTask() {
    const task = this.generateTask
    if (task?.data == null || isTerminalTaskStatus(task.data?.status)) return
    const image = await this.generatePhase.run(async (reporter) => {
      const { imageUrls } = await task.untilCompleted(reporter)
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

  /**
   * Cancel the ongoing generation if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    return this.generateTask?.tryCancel()
  }

  export(basePath = 'gen/assets'): [RawCostumeGenConfig, Files] {
    const files: Files = {}
    const assetsPath = assetsPathFor(basePath, this.name)
    const image = this.image
    const imagePath = image != null ? `${assetsPath}/image${extname(image.name)}` : null
    if (image != null && imagePath != null) {
      files[imagePath] = image
    }
    const finishPhaseSerialized = mapPhaseResult(this.finishPhase.export(), (result) => {
      const [resultConfig, resultFiles] = result.export({ basePath: `${assetsPath}/result` })
      Object.assign(files, resultFiles)
      return resultConfig
    })
    const config: RawCostumeGenConfig = {
      id: this.id,
      settings: this.settings,
      referenceCostumeId: this.referenceCostumeId ?? undefined,
      enrichPhaseSerialized: this.enrichPhase.export(),
      generateTaskSerialized: this.generateTask?.export(),
      generatePhaseSerialized: mapPhaseResult(this.generatePhase.export(), (result) => {
        const filePath = `${assetsPath}/generated${extname(result.name)}`
        files[filePath] = result
        return filePath
      }),
      finishPhaseSerialized
    }
    if (imagePath != null) config.imagePath = imagePath
    return [config, files]
  }

  static load(
    i18n: I18n,
    parent: Sprite | SpriteGen,
    project: SpxProject,
    config: RawCostumeGenConfig,
    files: Files,
    basePath = 'gen/assets'
  ) {
    const {
      id,
      settings,
      imagePath,
      enrichPhaseSerialized,
      generateTaskSerialized,
      generatePhaseSerialized,
      finishPhaseSerialized,
      referenceCostumeId
    } = config
    const genId = id ?? nanoid()
    if (settings?.name == null) throw new Error('settings name expected in costume gen config')
    const assetsPath = assetsPathFor(basePath, settings.name)
    const inits: CostumeGenInits = { id: genId }
    if (settings != null) inits.settings = settings
    if (referenceCostumeId != null) inits.referenceCostumeId = referenceCostumeId
    if (enrichPhaseSerialized != null) inits.enrichPhase = Phase.load(enrichPhaseSerialized)
    if (generateTaskSerialized != null) inits.generateTask = Task.load(generateTaskSerialized)
    if (generatePhaseSerialized != null) {
      inits.generatePhase = Phase.load(
        mapPhaseResult(generatePhaseSerialized, (filePath) => {
          const file = files[filePath]
          if (file == null) throw new Error(`file ${filePath} not found for costume gen ${genId}`)
          return file
        })
      )
    }
    if (imagePath != null) {
      const image = files[imagePath]
      if (image == null) throw new Error(`file ${imagePath} not found for costume gen ${genId}`)
      inits.image = image
    }
    if (finishPhaseSerialized != null) {
      inits.finishPhase = Phase.load(
        mapPhaseResult(finishPhaseSerialized, (costumeConfig) => {
          return Costume.load(costumeConfig, files, { basePath: `${assetsPath}/result`, includeId: true })
        })
      )
    }
    const gen = new CostumeGen(i18n, parent, project, inits)
    gen.restoreGenerateTask()
    return gen
  }
}
