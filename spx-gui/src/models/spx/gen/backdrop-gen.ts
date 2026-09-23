import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable, promiseForSignal } from '@/utils/disposable'
import type { Prettify } from '@/utils/types'
import type { I18n } from '@/utils/i18n'
import { encodePathSegment, extname } from '@/utils/path'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import {
  adoptAsset,
  enrichBackdropSettings,
  isTerminalTaskStatus,
  TaskType,
  TaskStatus,
  type BackdropSettings
} from '@/apis/aigc'
import type { File, Files } from '../../common/file'
import { fromConfig, toConfig, listDirs } from '../../common/file'
import { createFileWithUniversalUrl, saveFile } from '../../common/cloud'
import { ensureValidBackdropName, validateBackdropName, type BackdropLikeParent } from '../common/asset-name'
import { backdrop2Asset } from '../common/asset'
import type { SpxProject } from '../project'
import { Backdrop, type RawBackdropConfig } from '../backdrop'
import { getProjectSettings, mapPhaseResult, Phase, Task, type PhaseSerialized, type TaskSerialized } from './common'
import { loadReferenceImageFile, saveReferenceImageFile, validateReferenceImage } from './reference-image'

export type BackdropGenInits = {
  id?: string
  settings?: Partial<BackdropSettings>
  referenceImage?: File | null
  imageIndex?: number
  result?: Backdrop
  enrichPhase?: Phase<BackdropSettings>
  generateTask?: Task<TaskType.GenerateBackdrop>
  generatePhase?: Phase<File[]>
}

/** The raw config data used for exporting or loading a BackdropGen instance. */
export type RawBackdropGenConfig = Prettify<
  Omit<BackdropGenInits, 'result' | 'enrichPhase' | 'generateTask' | 'generatePhase' | 'referenceImage'> & {
    referenceImagePath?: string
    resultConfig?: RawBackdropConfig
    enrichPhaseSerialized?: PhaseSerialized<BackdropSettings>
    generateTaskSerialized?: TaskSerialized<TaskType.GenerateBackdrop>
    generatePhaseSerialized?: PhaseSerialized<string[]>
  }
>

export const backdropGenAssetPath = 'assets/backdrop-gens'
const backdropGenConfigFileName = 'index.json'

function assetsPathFor(name: string) {
  return `gen/assets/backdrops/${encodePathSegment(name)}`
}

export class BackdropGen extends Disposable {
  id: string
  private i18n: I18n
  private project: SpxProject
  private enrichPhase: Phase<BackdropSettings>
  private generateTask: Task<TaskType.GenerateBackdrop> | null
  private generatePhase: Phase<File[]>

  constructor(i18n: I18n, project: SpxProject, inits: BackdropGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.i18n = i18n
    this.project = project
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich backdrop settings', zh: '丰富背景设置' })
    this.generateTask = inits.generateTask ?? null
    this.generateTask?.disposeOnSignal(this.getSignal())
    this.generatePhase = inits.generatePhase ?? new Phase({ en: 'generate backdrop images', zh: '生成背景图片' })
    this.settings = {
      name: '',
      category: BackdropCategory.Unspecified,
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null,
      ...inits.settings
    }
    this.referenceImage = inits.referenceImage ?? null
    if (this.referenceImage != null) validateReferenceImage(this.referenceImage)
    this.imageIndex = inits.imageIndex ?? null
    this.result = inits.result ?? null
    return reactive(this) as this
  }

  private parent: BackdropLikeParent | null = null
  setParent(parent: BackdropLikeParent | null) {
    this.parent = parent
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateBackdropName(name, this.parent)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.settings.name = name
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.track(
      enrichBackdropSettings(
        this.settings.description,
        this.settings,
        getProjectSettings(this.project),
        this.i18n.lang.value
      )
    )
    this.setSettings(draft)
  }

  settings: BackdropSettings
  /**
   * Update multiple settings at once.
   * NOTE: the name in updates may be altered to avoid conflict
   */
  setSettings(updates: Partial<BackdropSettings>) {
    if (updates.name != null && updates.name !== this.settings.name) {
      const newName = ensureValidBackdropName(updates.name, this.parent)
      updates = { ...updates, name: newName }
    }
    Object.assign(this.settings, updates)
  }

  get imagesGenState() {
    return this.generatePhase.state
  }
  async genImages() {
    this.setImageIndex(null)
    this.generateTask?.tryCancel()
    this.generateTask?.dispose()
    const task = new Task(TaskType.GenerateBackdrop)
    task.disposeOnSignal(this.getSignal())
    this.generateTask = task
    const signal = task.getSignal()
    return this.generatePhase.run(async (reporter) => {
      const referenceImageUrl = this.referenceImage == null ? null : await saveFile(this.referenceImage, signal)
      signal.throwIfAborted()
      await task.start({ settings: { ...this.settings, referenceImageUrl }, n: 4 })
      signal.throwIfAborted()
      const { imageUrls } = await Promise.race([task.untilCompleted(reporter), promiseForSignal(signal)])
      return imageUrls.map((url) => createFileWithUniversalUrl(url))
    })
  }

  referenceImage: File | null = null
  setReferenceImage(file: File | null) {
    if (file != null) validateReferenceImage(file)
    this.referenceImage = file
  }
  restoreGenerateTask() {
    const task = this.generateTask
    if (task?.data == null || isTerminalTaskStatus(task.data?.status)) return
    this.generatePhase.run(async (reporter) => {
      const { imageUrls } = await task.untilCompleted(reporter)
      return imageUrls.map((url) => createFileWithUniversalUrl(url))
    })
  }

  imageIndex: number | null
  get image(): File | null {
    if (this.imageIndex == null) return null
    const images = this.imagesGenState.result
    if (images == null) return null
    return images[this.imageIndex] ?? null
  }
  setImageIndex(index: number | null) {
    this.imageIndex = index
  }

  result: Backdrop | null

  async finish() {
    const image = this.image
    if (image == null) throw new Error('image expected')
    const backdrop = await Backdrop.create(this.settings.name, image)
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
    const taskIds = this.generateTask?.data?.status === TaskStatus.Completed ? [this.generateTask.data.id] : []
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
    const task = this.generateTask
    if (this.generatePhase.state.status === 'running') this.generateTask = null
    task?.dispose()
    return task?.tryCancel()
  }

  export(): Files {
    const files: Files = {}
    const assetsPath = assetsPathFor(this.name)
    const generatePhaseSerialized = mapPhaseResult(this.generatePhase.export(), (r) =>
      r.map((file, idx) => {
        const filePath = `${assetsPath}/image_${idx}${extname(file.name)}`
        files[filePath] = file
        return filePath
      })
    )
    const config: RawBackdropGenConfig = {
      id: this.id,
      settings: this.settings,
      referenceImagePath: saveReferenceImageFile(files, assetsPath, this.referenceImage) ?? undefined,
      enrichPhaseSerialized: this.enrichPhase.export(),
      generateTaskSerialized: this.generateTask?.export(),
      generatePhaseSerialized
    }
    if (this.imageIndex != null) config.imageIndex = this.imageIndex
    if (this.result != null) {
      const [resultConfig, resultFiles] = this.result.export({
        assetPath: `${assetsPath}/result`
      })
      config.resultConfig = resultConfig
      Object.assign(files, resultFiles)
    }
    files[`${backdropGenAssetPath}/${encodePathSegment(this.name)}/${backdropGenConfigFileName}`] = fromConfig(
      backdropGenConfigFileName,
      config
    )
    return files
  }

  static async loadAll(i18n: I18n, project: SpxProject, files: Files) {
    const names = listDirs(files, backdropGenAssetPath)
    return Promise.all(names.map((name) => BackdropGen.load(name, i18n, project, files)))
  }

  static async load(name: string, i18n: I18n, project: SpxProject, files: Files) {
    const configFile = files[`${backdropGenAssetPath}/${name}/${backdropGenConfigFileName}`]
    if (configFile == null) throw new Error(`config file not found for backdrop gen ${name}`)
    const config = (await toConfig(configFile)) as RawBackdropGenConfig
    if (config.settings?.name == null) throw new Error('settings name expected in backdrop gen config')
    const assetsPath = assetsPathFor(config.settings.name)
    const {
      resultConfig,
      referenceImagePath,
      enrichPhaseSerialized,
      generateTaskSerialized,
      generatePhaseSerialized,
      ...extraConfig
    } = config
    const inits: BackdropGenInits = extraConfig
    if (referenceImagePath != null) {
      inits.referenceImage = loadReferenceImageFile(referenceImagePath, assetsPath, files, `backdrop gen ${config.id}`)
    }
    if (enrichPhaseSerialized != null) inits.enrichPhase = Phase.load(enrichPhaseSerialized)
    if (generateTaskSerialized != null) inits.generateTask = Task.load(generateTaskSerialized)
    if (generatePhaseSerialized != null) {
      inits.generatePhase = Phase.load<File[]>(
        mapPhaseResult(generatePhaseSerialized, (r) =>
          r.map((filePath) => {
            const file = files[filePath]
            if (file == null) throw new Error(`file ${filePath} not found for backdrop gen ${config.id}`)
            return file
          })
        )
      )
    }
    if (resultConfig != null) {
      inits.result = await Backdrop.load(resultConfig, files, { assetPath: `${assetsPath}/result` })
    }
    const gen = new BackdropGen(i18n, project, inits)
    gen.restoreGenerateTask()
    return gen
  }
}
