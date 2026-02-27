import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { Prettify } from '@/utils/types'
import { extname } from '@/utils/path'
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
import { createFileWithUniversalUrl } from '../../common/cloud'
import { ensureValidBackdropName, validateBackdropName, type BackdropLikeParent } from '../common/asset-name'
import { backdrop2Asset } from '../common/asset'
import type { SpxProject } from '../project'
import { Backdrop, type RawBackdropConfig } from '../backdrop'
import { getProjectSettings, mapPhaseResult, Phase, Task, type PhaseSerialized, type TaskSerialized } from './common'

export type BackdropGenInits = {
  id?: string
  settings?: Partial<BackdropSettings>
  imageIndex?: number
  result?: Backdrop
  enrichPhase?: Phase<BackdropSettings>
  generateTask?: Task<TaskType.GenerateBackdrop>
  generatePhase?: Phase<File[]>
}

/** The raw config data used for exporting or loading a BackdropGen instance. */
export type RawBackdropGenConfig = Prettify<
  Omit<BackdropGenInits, 'result' | 'enrichPhase' | 'generateTask' | 'generatePhase'> & {
    resultConfig?: RawBackdropConfig
    enrichPhaseSerialized?: PhaseSerialized<BackdropSettings>
    generateTaskSerialized?: TaskSerialized<TaskType.GenerateBackdrop>
    generatePhaseSerialized?: PhaseSerialized<string[]>
  }
>

export const backdropGenAssetPath = 'assets/backdrop-gens'
const backdropGenConfigFileName = 'index.json'

function assetsPathFor(name: string) {
  return `gen/assets/backdrops/${name}`
}

export class BackdropGen extends Disposable {
  id: string
  private project: SpxProject
  private enrichPhase: Phase<BackdropSettings>
  private generateTask: Task<TaskType.GenerateBackdrop> | null
  private generatePhase: Phase<File[]>

  constructor(project: SpxProject, inits: BackdropGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.project = project
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich backdrop settings', zh: '丰富背景设置' })
    this.generateTask = inits.generateTask ?? null
    this.generatePhase = inits.generatePhase ?? new Phase({ en: 'generate backdrop images', zh: '生成背景图片' })
    this.settings = {
      name: '',
      category: BackdropCategory.Unspecified,
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      ...inits.settings
    }
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
      enrichBackdropSettings(this.settings.description, this.settings, getProjectSettings(this.project))
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
  genImages() {
    return this.generatePhase.run(async (reporter) => {
      this.setImageIndex(null)

      this.generateTask?.tryCancel()
      this.generateTask = new Task(TaskType.GenerateBackdrop)
      await this.generateTask.start({
        settings: this.settings,
        n: 4
      })
      const { imageUrls } = await this.generateTask.untilCompleted(reporter)
      return imageUrls.map((url) => createFileWithUniversalUrl(url))
    })
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

  get isPreparePhase() {
    return this.result == null
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
    return this.generateTask?.tryCancel()
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
    files[`${backdropGenAssetPath}/${this.name}/${backdropGenConfigFileName}`] = fromConfig(
      backdropGenConfigFileName,
      config
    )
    return files
  }

  static async loadAll(project: SpxProject, files: Files) {
    const names = listDirs(files, backdropGenAssetPath)
    return Promise.all(names.map((name) => BackdropGen.load(name, project, files)))
  }

  static async load(name: string, project: SpxProject, files: Files) {
    const configFile = files[`${backdropGenAssetPath}/${name}/${backdropGenConfigFileName}`]
    if (configFile == null) throw new Error(`config file not found for backdrop gen ${name}`)
    const config = (await toConfig(configFile)) as RawBackdropGenConfig
    if (config.settings?.name == null) throw new Error('settings name expected in backdrop gen config')
    const assetsPath = assetsPathFor(config.settings.name)
    const { resultConfig, enrichPhaseSerialized, generateTaskSerialized, generatePhaseSerialized, ...extraConfig } =
      config
    const inits: BackdropGenInits = extraConfig
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
    if (resultConfig != null) inits.result = Backdrop.load(resultConfig, files, { assetPath: `${assetsPath}/result` })
    const gen = new BackdropGen(project, inits)
    gen.restoreGenerateTask()
    return gen
  }
}
