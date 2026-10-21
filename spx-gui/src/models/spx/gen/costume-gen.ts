import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { encodePathSegment, extname } from '@/utils/path'
import { Disposable } from '@/utils/disposable'
import { capture } from '@/utils/exception'
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
import {
  loadReferenceImageSelection,
  resolveInitialReferenceImageSelection,
  saveReferenceImageFile,
  type ReferenceImageSelection,
  type StoredReferenceImageSelection,
  validateReferenceImage
} from './reference-image'
import type { SpriteContent } from '../common/sprite-content'
import { spriteEditDemoEnabled } from './edit-demo'

export type CostumeEditComment = {
  id: string
  /** Coordinates relative to the original image, in the range 0–1. */
  x: number
  y: number
  content: string
}

export type CostumeGenInits = {
  id?: string
  settings?: Partial<Omit<CostumeSettings, 'referenceImageUrl'>>
  referenceCostumeId?: string
  referenceImageSelection?: ReferenceImageSelection
  image?: File
  enrichPhase?: Phase<CostumeSettings>
  generateTask?: Task<TaskType.GenerateCostume>
  generatePhase?: Phase<File>
  finishPhase?: Phase<Costume>
  savedTaskId?: string
  editSource?: Costume
  lastEdit?: { instruction: string; referenceImageUrl: string }
  editComments?: CostumeEditComment[]
}

export type RawCostumeGenConfig = Prettify<
  Omit<
    CostumeGenInits,
    | 'result'
    | 'enrichPhase'
    | 'generateTask'
    | 'generatePhase'
    | 'finishPhase'
    | 'image'
    | 'editSource'
    | 'referenceCostumeId'
    | 'referenceImageSelection'
  > & {
    imagePath?: string
    editSourceConfig?: RawCostumeConfig
    reference?: StoredReferenceImageSelection
    /** Read only for migration; new saves use reference. */
    referenceCostumeId?: string
    enrichPhaseSerialized?: PhaseSerialized<CostumeSettings>
    generateTaskSerialized?: TaskSerialized<TaskType.GenerateCostume>
    generatePhaseSerialized?: PhaseSerialized<string>
    finishPhaseSerialized?: PhaseSerialized<RawCostumeConfig>
  }
>

function assetsPathFor(basePath: string, name: string) {
  return `${basePath}/costumes/${encodePathSegment(name)}`
}

/** `CostumeGen` tracks the generation process of a costume. */
export class CostumeGen extends Disposable {
  id: string
  private i18n: I18n
  parent: Sprite | SpriteContent
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: SpxProject
  private enrichPhase: Phase<CostumeSettings>
  private generateTask: Task<TaskType.GenerateCostume> | null
  private generatePhase: Phase<File>
  private finishPhase: Phase<Costume>
  private savedResult: Costume | null
  private savedTaskId: string | null
  private editSource: Costume | null
  private lastEdit: CostumeGenInits['lastEdit'] | null
  editComments: CostumeEditComment[]

  constructor(i18n: I18n, parent: Sprite | SpriteContent, project: SpxProject, inits: CostumeGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.i18n = i18n
    this.parent = parent
    this.project = project
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich costume settings', zh: '丰富造型设置' })
    this.generateTask = inits.generateTask ?? null
    if (this.generateTask != null) this.addDisposable(this.generateTask)
    this.generatePhase = inits.generatePhase ?? new Phase({ en: 'generate costume image', zh: '生成造型图片' })
    this.finishPhase = inits.finishPhase ?? new Phase({ en: 'save costume', zh: '保存造型' })
    this.savedResult = this.finishPhase.state.result ?? null
    this.editSource = inits.editSource ?? null
    this.lastEdit = inits.lastEdit ?? null
    this.editComments = inits.editComments ?? []
    this.savedTaskId =
      inits.savedTaskId ??
      (this.savedResult != null && this.generateTask?.data?.status === TaskStatus.Completed
        ? this.generateTask.data.id
        : null)
    this.settings = {
      name: '',
      description: '',
      facing: Facing.Unspecified,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null,
      ...inits.settings
    }
    this.referenceImageSelection = resolveInitialReferenceImageSelection(
      inits.referenceImageSelection,
      inits.referenceCostumeId
    )
    this.image = inits.image ?? null
    return reactive(this) as this
  }

  /** Get IDs for (completed) tasks. */
  getTaskIds() {
    const currentTaskId = this.generateTask?.data?.status === TaskStatus.Completed ? this.generateTask.data.id : null
    return [...new Set([this.savedTaskId, currentTaskId].filter((id) => id != null))]
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

  referenceImageSelection: ReferenceImageSelection
  get referenceCostume() {
    const selection = this.referenceImageSelection
    if (selection?.type !== 'costume') return null
    return this.sprite.costumes.find((costume) => costume.id === selection.costumeId) ?? null
  }
  setReferenceCostume(costumeId: string | null) {
    this.setReferenceImageSelection(costumeId == null ? null : { type: 'costume', costumeId })
  }

  setReferenceImageSelection(selection: ReferenceImageSelection) {
    if (selection?.type === 'local-image') validateReferenceImage(selection.file)
    this.referenceImageSelection = selection
  }

  image: File | null = null
  setImage(file: File | null) {
    if (file !== this.image) this.setEditComments([])
    this.image = file
  }

  get generateState() {
    return this.generatePhase.state
  }
  resetGenerateState() {
    this.generatePhase.reset()
  }
  get editInstruction() {
    return this.lastEdit?.instruction ?? null
  }
  acceptEdit() {
    this.editSource = null
    this.lastEdit = null
    this.setEditComments([])
  }

  setEditComments(comments: CostumeEditComment[]) {
    this.editComments = comments
  }
  async generate() {
    this.editSource = null
    return this.runGeneration()
  }

  async edit(instruction: string) {
    const source = this.result
    if (source == null) throw new Error('Saved costume expected')
    if (this.editComments.length > 0) {
      instruction = [
        instruction.trim(),
        'Apply the following comments to the reference image. Coordinates use a 0–999 scale: origin at the top-left, x increases rightward, y increases downward.',
        ...this.editComments.map(
          (comment) => `At (${Math.round(comment.x * 999)}, ${Math.round(comment.y * 999)}): ${comment.content}`
        ),
        'Each coordinate identifies only the part containing that point. Preserve everything else. Do not draw markers, labels, or coordinates.'
      ]
        .filter((line) => line !== '')
        .join('\n')
    }
    if (instruction.trim() === '') throw new Error('Edit instruction expected')
    this.editSource ??= source.clone(true)
    return this.runGeneration({ image: this.image ?? source.img, instruction: instruction.trim() })
  }

  private async runGeneration(edit: { image: File; instruction: string } | null = null) {
    this.generateTask?.tryCancel()
    this.generateTask?.dispose()
    this.generateTask = new Task(TaskType.GenerateCostume)
    const task = this.generateTask
    this.addDisposable(task)
    const signal = task.getSignal()
    const image = await this.generatePhase.run(async (reporter) => {
      let referenceImageUrl: string | null = null
      if (edit != null) {
        referenceImageUrl = await saveFile(edit.image, signal)
        this.lastEdit = { instruction: edit.instruction, referenceImageUrl }
      } else if (this.referenceImageSelection?.type === 'local-image') {
        referenceImageUrl = await saveFile(this.referenceImageSelection.file, signal)
      } else if (this.referenceCostume != null) {
        referenceImageUrl = await saveFile(this.referenceCostume.img, signal)
      } else if (this.result != null) {
        referenceImageUrl = await saveFile(this.result.img, signal)
      }
      signal.throwIfAborted()
      if (edit == null) this.lastEdit = null
      const settings = { ...this.settings, referenceImageUrl }
      if (edit != null && spriteEditDemoEnabled) {
        // The deployed API supports image editing through a reference image and description.
        settings.description = [
          'Edit the provided game sprite image according to the instruction below.',
          "Preserve the subject's identity, pose, art style, proportions, framing, and all other details unless the instruction explicitly asks to change them.",
          `Edit instruction: ${edit.instruction}`
        ].join('\n')
      }
      await task.start({
        settings,
        n: 1,
        ...(edit == null || spriteEditDemoEnabled ? {} : { editInstruction: edit.instruction })
      })
      const { imageUrls } = await task.untilCompleted(reporter)
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
    return this.finishPhase.state.result ?? this.savedResult ?? undefined
  }
  resetFinishState() {
    this.finishPhase.reset()
  }

  async finish() {
    const image = this.image
    if (image == null) throw new Error('Costume not generated yet')
    const source = this.editSource ?? this.result
    const result = await this.finishPhase.run(async () => {
      const costume = source != null ? source.clone(true) : await Costume.create(this.settings.name, image)
      if (source != null) {
        costume.setName(this.settings.name, true)
        costume.setImg(image)
        const [sourceSize, rawSize] = await Promise.all([source.getSize(), costume.getRawSize()])
        const resolution = Math.max(rawSize.width / sourceSize.width, rawSize.height / sourceSize.height)
        costume.setBitmapResolution(resolution)
        costume.setPivot({
          x: (source.pivot.x / sourceSize.width) * (rawSize.width / resolution),
          y: (source.pivot.y / sourceSize.height) * (rawSize.height / resolution)
        })
        costume.setFaceRight(source.faceRight)
      } else {
        await costume.autoFit()
      }
      return costume
    })
    this.savedResult = result
    if (this.generateTask?.data?.status === TaskStatus.Completed) this.savedTaskId = this.generateTask.data.id
    return result
  }

  /**
   * Cancel the ongoing generation if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    const task = this.generateTask
    if (this.generateState.status === 'running') this.generateTask = null
    task?.dispose()
    return task?.tryCancel()
  }

  export(basePath = 'gen/assets'): [RawCostumeGenConfig, Files] {
    const files: Files = {}
    const assetsPath = assetsPathFor(basePath, this.name)
    const image = this.image
    let imagePath = image != null ? `${assetsPath}/image${extname(image.name)}` : null
    const savedPhase = this.finishPhase.export()
    if (savedPhase.state.status !== 'finished' && this.savedResult != null) {
      savedPhase.state = { status: 'finished', result: this.savedResult }
    }
    const finishPhaseSerialized = mapPhaseResult(savedPhase, (result) => {
      const [resultConfig, resultFiles] = result.export({ basePath: `${assetsPath}/result` })
      Object.assign(files, resultFiles)
      if (image === result.img && resultConfig.path != null) {
        imagePath = `${assetsPath}/result/${resultConfig.path}`
      }
      return resultConfig
    })
    if (image != null && imagePath != null) files[imagePath] = image
    const selection = this.referenceImageSelection
    const config: RawCostumeGenConfig = {
      id: this.id,
      savedTaskId: this.savedTaskId ?? undefined,
      lastEdit: this.lastEdit ?? undefined,
      editComments: this.editComments,
      settings: this.settings,
      reference:
        selection?.type === 'local-image'
          ? { type: 'local-image', filePath: saveReferenceImageFile(files, assetsPath, selection.file) }
          : selection,
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
    if (this.editSource != null) {
      const [sourceConfig, sourceFiles] = this.editSource.export({ basePath: `${assetsPath}/source` })
      config.editSourceConfig = sourceConfig
      Object.assign(files, sourceFiles)
    }
    return [config, files]
  }

  static load(
    i18n: I18n,
    parent: Sprite | SpriteContent,
    project: SpxProject,
    config: RawCostumeGenConfig,
    files: Files,
    basePath = 'gen/assets',
    restoreTasks = true
  ) {
    const {
      id,
      settings,
      imagePath,
      reference,
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
    inits.savedTaskId = config.savedTaskId
    inits.lastEdit = config.lastEdit
    inits.editComments = config.editComments
    if (config.editSourceConfig != null) {
      inits.editSource = Costume.load(config.editSourceConfig, files, {
        basePath: `${assetsPath}/source`,
        includeId: true
      })
    }
    if (settings != null) inits.settings = settings
    inits.referenceImageSelection = loadReferenceImageSelection(reference, referenceCostumeId, files)
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
    if (restoreTasks)
      gen
        .restoreGenerateTask()
        .then(async () => {
          if (gen.editInstruction != null && gen.result != null && gen.image !== gen.result.img) await gen.finish()
        })
        .catch(capture)
    return gen
  }
}
