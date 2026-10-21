import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { encodePathSegment, extname } from '@/utils/path'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import {
  type AnimationSettings,
  enrichAnimationSettings,
  isTerminalTaskStatus,
  type TaskParamsExtractVideoFrames,
  TaskType,
  TaskStatus
} from '@/apis/aigc'
import type { SpxProject } from '../project'
import { Sprite } from '../sprite'
import type { File, Files } from '../../common/file'
import { ensureValidAnimationName, validateAnimationName } from '../common/asset-name'
import { createFileWithUniversalUrl, saveFile } from '../../common/cloud'
import { Animation, type RawAnimationConfig } from '../animation'
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
import type { SpriteContent } from '../common/sprite-content'
import { simulateSpriteEdit, spriteEditDemoEnabled } from './edit-demo'
import {
  createAnimationReferenceVideo,
  getAnimationReferenceLayout,
  prepareAnimationReferenceVideo
} from './animation-reference-video'
import {
  loadReferenceImageSelection,
  resolveInitialReferenceImageSelection,
  saveReferenceImageFile,
  type ReferenceImageSelection,
  type StoredReferenceImageSelection,
  validateAnimationReferenceImage,
  validateReferenceImage
} from './reference-image'

export type FramesConfig = Omit<TaskParamsExtractVideoFrames, 'videoUrl'>

export type AnimationGenInits = {
  id?: string
  settings?: Partial<Omit<AnimationSettings, 'referenceFrameUrl'>>
  referenceCostumeId?: string | null
  referenceImageSelection?: ReferenceImageSelection
  video?: File
  framesConfig?: FramesConfig
  enrichPhase?: Phase<AnimationSettings>
  generateVideoTask?: Task<TaskType.GenerateAnimationVideo>
  generateVideoPhase?: Phase<File>
  extractFramesTask?: Task<TaskType.ExtractVideoFrames>
  finishPhase?: Phase<Animation>
  hasPendingVideo?: boolean
  savedTaskIds?: string[]
  editSource?: Animation
  lastEdit?: { instruction: string; referenceVideoUrl: string }
}

export type RawAnimationGenConfig = Prettify<
  Omit<
    AnimationGenInits,
    | 'enrichPhase'
    | 'generateVideoTask'
    | 'generateVideoPhase'
    | 'extractFramesTask'
    | 'finishPhase'
    | 'video'
    | 'editSource'
    | 'referenceCostumeId'
    | 'referenceImageSelection'
  > & {
    videoPath?: string
    editSourceConfig?: {
      animationConfig: RawAnimationConfig
      costumeConfigs: RawCostumeConfig[]
    }
    reference?: StoredReferenceImageSelection
    /** Read only for migration; new saves use reference. */
    referenceCostumeId?: string
    enrichPhaseSerialized?: PhaseSerialized<AnimationSettings>
    generateVideoTaskSerialized?: TaskSerialized<TaskType.GenerateAnimationVideo>
    generateVideoPhaseSerialized?: PhaseSerialized<string>
    extractFramesTaskSerialized?: TaskSerialized<TaskType.ExtractVideoFrames>
    finishPhaseSerialized?: PhaseSerialized<{
      animationConfig: RawAnimationConfig
      costumeConfigs: RawCostumeConfig[]
    }>
  }
>

function assetsPathFor(basePath: string, name: string) {
  return `${basePath}/animations/${encodePathSegment(name)}`
}

function sameReferenceSelection(left: ReferenceImageSelection, right: ReferenceImageSelection) {
  if (left?.type !== right?.type) return false
  if (left?.type === 'local-image' && right?.type === 'local-image') return left.file === right.file
  if (left?.type === 'costume' && right?.type === 'costume') return left.costumeId === right.costumeId
  return true
}

export class AnimationGen extends Disposable {
  id: string
  parent: Sprite | SpriteContent
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: SpxProject
  private i18n: I18n

  private enrichPhase: Phase<AnimationSettings>
  private generateVideoTask: Task<TaskType.GenerateAnimationVideo> | null
  private generateVideoPhase: Phase<File>
  private extractFramesTask: Task<TaskType.ExtractVideoFrames> | null
  private finishPhase: Phase<Animation>
  private savedResult: Animation | null
  private savedTaskIds: string[]
  private videoPending: boolean
  private editSource: Animation | null
  private lastEdit: AnimationGenInits['lastEdit'] | null

  constructor(i18n: I18n, parent: Sprite | SpriteContent, project: SpxProject, inits: AnimationGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
    this.i18n = i18n
    this.parent = parent
    this.project = project
    this.settings = {
      name: '',
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      loopMode: AnimationLoopMode.NonLoopable,
      referenceFrameUrl: null,
      ...inits.settings
    }
    this.referenceImageSelection = resolveInitialReferenceImageSelection(
      inits.referenceImageSelection,
      inits.referenceCostumeId
    )
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich animation settings', zh: '丰富动画设置' })
    this.generateVideoTask = inits.generateVideoTask ?? null
    if (this.generateVideoTask != null) this.addDisposable(this.generateVideoTask)
    this.generateVideoPhase =
      inits.generateVideoPhase ?? new Phase({ en: 'generate animation video', zh: '生成动画视频' })
    this.video = inits.video ?? null
    this.framesConfig = inits.framesConfig ?? null
    this.extractFramesTask = inits.extractFramesTask ?? null
    this.finishPhase =
      inits.finishPhase ?? new Phase({ en: 'extract frames and save animation', zh: '提取帧并保存动画' })
    this.savedResult = this.finishPhase.state.result ?? null
    this.editSource = inits.editSource ?? null
    this.lastEdit = inits.lastEdit ?? null
    this.savedTaskIds = inits.savedTaskIds ?? []
    this.videoPending = inits.hasPendingVideo ?? (this.video != null && this.savedResult == null)
    if (this.extractFramesTask != null) this.addDisposable(this.extractFramesTask)
    return reactive(this) as this
  }

  /** Get IDs for (completed) tasks. */
  getTaskIds() {
    const taskIds = [this.generateVideoTask, this.extractFramesTask]
      .filter((t): t is Task<TaskType.GenerateAnimationVideo> | Task<TaskType.ExtractVideoFrames> => t != null)
      .filter((t) => t.data?.status === TaskStatus.Completed)
      .map((t) => t.data!.id)
    return [...new Set([...this.savedTaskIds, ...taskIds])]
  }

  get name() {
    return this.settings.name
  }
  setName(name: string) {
    const err = validateAnimationName(name, this.parent)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.settings.name = name
    this.result?.setName(name)
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const enriched = await this.enrichPhase.track(
      enrichAnimationSettings(
        this.settings.description,
        this.settings,
        getSpriteSettings(this.sprite),
        getProjectSettings(this.project),
        this.i18n.lang.value
      )
    )
    this.setSettings(enriched)
  }

  settings: AnimationSettings
  /**
   * Update multiple settings at once.
   * NOTE: the name in updates may be altered to avoid conflict
   */
  setSettings(updates: Partial<AnimationSettings>) {
    if (updates.name != null && updates.name !== this.settings.name) {
      const newName = ensureValidAnimationName(updates.name, this.parent)
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
    if (!sameReferenceSelection(selection, this.referenceImageSelection)) this.resetGenerateVideoTasks()
    this.referenceImageSelection = selection
  }

  get generateVideoState() {
    return this.generateVideoPhase.state
  }
  resetGenerateVideoState() {
    this.generateVideoPhase.reset()
  }
  get editInstruction() {
    return this.lastEdit?.instruction ?? null
  }
  acceptEdit() {
    this.editSource = null
    this.lastEdit = null
  }
  async generateVideo() {
    this.editSource = null
    this.setVideo(null)
    this.setFramesConfig(null)
    return this.runVideoGeneration()
  }
  async editVideo(instruction: string) {
    if (instruction.trim() === '') throw new Error('Edit instruction expected')
    const source = this.video ?? this.result?.clone(true)
    if (source == null) throw new Error('Video or saved animation expected')
    if (this.result != null) this.editSource ??= this.result.clone(true)
    return this.runVideoGeneration({
      source,
      framesConfig: this.framesConfig == null ? null : { ...this.framesConfig },
      instruction: instruction.trim()
    })
  }
  private async runVideoGeneration(
    edit: { source: Animation | File; framesConfig: FramesConfig | null; instruction: string } | null = null
  ) {
    this.resetGenerateVideoTasks()
    this.generateVideoTask = new Task(TaskType.GenerateAnimationVideo)
    const task = this.generateVideoTask
    this.addDisposable(task)
    const signal = task.getSignal()
    const video = await this.generateVideoPhase.run(async (reporter) => {
      if (edit != null) {
        const referenceVideo =
          edit.source instanceof Animation
            ? await createAnimationReferenceVideo(edit.source, signal)
            : await prepareAnimationReferenceVideo(edit.source, edit.framesConfig, signal)
        const referenceVideoUrl = await saveFile(referenceVideo, signal)
        this.lastEdit = { instruction: edit.instruction, referenceVideoUrl }
        signal.throwIfAborted()
        if (spriteEditDemoEnabled) return simulateSpriteEdit(referenceVideo, signal)
        await task.start({
          settings: { ...this.settings, referenceFrameUrl: null, referenceVideoUrl },
          editInstruction: edit.instruction
        })
      } else {
        this.lastEdit = null
        const image =
          this.referenceImageSelection?.type === 'local-image'
            ? this.referenceImageSelection.file
            : this.referenceCostume?.img
        if (image == null) throw new Error('reference image or costume expected')
        await validateAnimationReferenceImage(image)
        signal.throwIfAborted()
        const referenceFrameUrl = await saveFile(image, signal)
        signal.throwIfAborted()
        await task.start({ settings: { ...this.settings, referenceFrameUrl } })
      }
      const { videoUrl } = await task.untilCompleted(reporter)
      return createFileWithUniversalUrl(videoUrl)
    })
    this.setFramesConfig(null)
    this.setVideo(video)
  }
  private resetGenerateVideoTasks() {
    this.generateVideoTask?.tryCancel()
    this.generateVideoTask?.dispose()
    this.generateVideoTask = null
  }
  restoreGenerateVideoTask() {
    const task = this.generateVideoTask
    if (task?.data == null) return
    if (
      isTerminalTaskStatus(task.data.status) &&
      (task.data.status !== TaskStatus.Completed || this.generateVideoPhase.state.status === 'finished')
    ) {
      return
    }
    this.generateVideoPhase.run(async (reporter) => {
      const { videoUrl } = await task.untilCompleted(reporter)
      const video = createFileWithUniversalUrl(videoUrl)
      this.setFramesConfig(null)
      this.setVideo(video)
      return video
    })
  }

  video: File | null
  setVideo(video: File | null) {
    if (this.video !== video) {
      this.extractFramesTask?.tryCancel()
      this.extractFramesTask?.dispose()
      this.extractFramesTask = null
    }
    this.video = video
    this.videoPending = video != null
  }
  get hasPendingVideo() {
    return this.video != null && this.videoPending
  }

  framesConfig: FramesConfig | null
  setFramesConfig(config: FramesConfig | null) {
    this.framesConfig = config
  }

  get finishState() {
    return this.finishPhase.state
  }
  resetFinishState() {
    this.finishPhase.reset()
  }
  get result() {
    return this.finishPhase.state.result ?? this.savedResult ?? undefined
  }
  private async createAnimationFromFrames(frameUrls: string[], durationInMs: number) {
    const source = this.editSource ?? this.result
    const layout = source == null ? null : await getAnimationReferenceLayout(source)
    const frameImgs = frameUrls.map((url) => createFileWithUniversalUrl(url))
    const costumes = await Promise.all(
      frameImgs.map(async (img, i) => {
        const costumeName = `${this.settings.name}_frame_${i + 1}`
        const costume = await Costume.create(costumeName, img)
        if (layout == null) {
          await costume.autoFit()
        } else {
          const { width } = await costume.getRawSize()
          costume.setBitmapResolution((width / layout.size) * layout.scale)
          costume.setPivot({ x: layout.origin.x / layout.scale, y: layout.origin.y / layout.scale })
          costume.setFaceRight(source!.costumes[0].faceRight)
        }
        return costume
      })
    )
    return Animation.create(this.settings.name, costumes, {
      duration: durationInMs / 1000,
      id: source?.id,
      sound: source?.sound ?? undefined,
      soundPlayback: source?.soundPlayback
    })
  }
  async finish() {
    const { video, framesConfig } = this
    if (video == null) throw new Error('video not ready yet')
    if (framesConfig == null) throw new Error('frames config not set')
    const result = await this.finishPhase.run(async (reporter) => {
      const videoUrl = await saveFile(video)
      this.extractFramesTask?.tryCancel()
      this.extractFramesTask?.dispose()
      this.extractFramesTask = new Task(TaskType.ExtractVideoFrames)
      this.addDisposable(this.extractFramesTask)
      await this.extractFramesTask.start({ videoUrl, ...framesConfig })
      const { frameUrls } = await this.extractFramesTask.untilCompleted(reporter)
      return this.createAnimationFromFrames(frameUrls, framesConfig.duration)
    })
    this.savedResult = result
    this.savedTaskIds = this.getTaskIds()
    this.videoPending = false
    return result
  }
  restoreExtractFramesTask() {
    const task = this.extractFramesTask
    const framesConfig = this.framesConfig
    if (task?.data == null || framesConfig == null || !this.hasPendingVideo) return
    if (isTerminalTaskStatus(task.data.status) && task.data.status !== TaskStatus.Completed) return
    this.finishPhase.run(async (reporter) => {
      const { frameUrls } = await task.untilCompleted(reporter)
      const result = await this.createAnimationFromFrames(frameUrls, framesConfig.duration)
      this.savedResult = result
      this.savedTaskIds = this.getTaskIds()
      this.videoPending = false
      return result
    })
  }

  /**
   * Cancel the ongoing generation/extraction if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    // TODO: Simplify generation cancellation (see https://github.com/goplus/builder/issues/3586)
    const task = this.generateVideoTask
    if (this.generateVideoState.status === 'running') this.generateVideoTask = null
    task?.dispose()
    return Promise.all([task?.tryCancel(), this.extractFramesTask?.tryCancel()])
  }

  export(basePath = 'gen/assets'): [RawAnimationGenConfig, Files] {
    const files: Files = {}
    const assetsPath = assetsPathFor(basePath, this.name)

    const selection = this.referenceImageSelection
    const savedPhase = this.finishPhase.export()
    if (savedPhase.state.status !== 'finished' && this.savedResult != null) {
      savedPhase.state = { status: 'finished', result: this.savedResult }
    }
    const config: RawAnimationGenConfig = {
      id: this.id,
      hasPendingVideo: this.hasPendingVideo,
      savedTaskIds: this.savedTaskIds,
      lastEdit: this.lastEdit ?? undefined,
      settings: this.settings,
      reference:
        selection?.type === 'local-image'
          ? { type: 'local-image', filePath: saveReferenceImageFile(files, assetsPath, selection.file) }
          : selection,
      framesConfig: this.framesConfig ?? undefined,
      enrichPhaseSerialized: this.enrichPhase.export(),
      generateVideoTaskSerialized: this.generateVideoTask?.export(),
      generateVideoPhaseSerialized: mapPhaseResult(this.generateVideoPhase.export(), (result) => {
        const filePath = `${assetsPath}/generated_video${extname(result.name)}`
        files[filePath] = result
        return filePath
      }),
      extractFramesTaskSerialized: this.extractFramesTask?.export(),
      finishPhaseSerialized: mapPhaseResult(savedPhase, (result) => {
        const [animationConfig, costumeConfigs, animationFiles] = result.export(`${assetsPath}/result`, {
          sounds: this.project.sounds,
          includeId: true
        })
        Object.assign(files, animationFiles)
        return { animationConfig, costumeConfigs }
      })
    }

    if (this.video != null) {
      const videoPath = `${assetsPath}/video${extname(this.video.name)}`
      files[videoPath] = this.video
      config.videoPath = videoPath
    }
    if (this.editSource != null) {
      const [animationConfig, costumeConfigs, sourceFiles] = this.editSource.export(`${assetsPath}/source`, {
        sounds: this.project.sounds,
        includeId: true
      })
      config.editSourceConfig = { animationConfig, costumeConfigs }
      Object.assign(files, sourceFiles)
    }

    return [config, files]
  }

  static load(
    i18n: I18n,
    parent: Sprite | SpriteContent,
    project: SpxProject,
    config: RawAnimationGenConfig,
    files: Files,
    basePath = 'gen/assets',
    restoreTasks = true
  ) {
    const {
      id,
      settings,
      reference,
      referenceCostumeId,
      framesConfig,
      videoPath,
      enrichPhaseSerialized,
      generateVideoTaskSerialized,
      generateVideoPhaseSerialized,
      extractFramesTaskSerialized,
      finishPhaseSerialized
    } = config

    const genId = id ?? nanoid()
    if (settings?.name == null) throw new Error('settings name expected in animation gen config')
    const settingsName = settings.name
    const assetsPath = assetsPathFor(basePath, settingsName)

    const inits: AnimationGenInits = {
      id: genId,
      hasPendingVideo: config.hasPendingVideo,
      savedTaskIds: config.savedTaskIds,
      lastEdit: config.lastEdit
    }
    inits.settings = settings
    if (config.editSourceConfig != null) {
      const { animationConfig, costumeConfigs } = config.editSourceConfig
      const costumes = costumeConfigs.map((costumeConfig) =>
        Costume.load(costumeConfig, files, { basePath: `${assetsPath}/source`, includeId: true })
      )
      const [source] = Animation.load(settingsName, animationConfig, costumes, {
        sounds: project.sounds,
        includeId: true
      })
      inits.editSource = source
    }
    inits.referenceImageSelection = loadReferenceImageSelection(reference, referenceCostumeId, files)
    if (framesConfig != null) inits.framesConfig = framesConfig
    if (enrichPhaseSerialized != null) inits.enrichPhase = Phase.load(enrichPhaseSerialized)
    if (generateVideoTaskSerialized != null) inits.generateVideoTask = Task.load(generateVideoTaskSerialized)
    if (generateVideoPhaseSerialized != null) {
      inits.generateVideoPhase = Phase.load(
        mapPhaseResult(generateVideoPhaseSerialized, (filePath) => {
          const file = files[filePath]
          if (file == null) throw new Error(`file ${filePath} not found for animation gen ${genId}`)
          return file
        })
      )
    }
    if (extractFramesTaskSerialized != null) inits.extractFramesTask = Task.load(extractFramesTaskSerialized)
    if (finishPhaseSerialized != null) {
      inits.finishPhase = Phase.load(
        mapPhaseResult(finishPhaseSerialized, ({ animationConfig, costumeConfigs }) => {
          const costumes = costumeConfigs.map((costumeConfig) =>
            Costume.load(costumeConfig, files, { basePath: `${assetsPath}/result`, includeId: true })
          )
          const [animation] = Animation.load(settingsName, animationConfig, costumes, {
            sounds: project.sounds,
            includeId: true
          })
          return animation
        })
      )
    }
    if (videoPath != null) {
      const videoFile = files[videoPath]
      if (videoFile == null) throw new Error(`file ${videoPath} not found for animation gen ${genId}`)
      inits.video = videoFile
    }

    const gen = new AnimationGen(i18n, parent, project, inits)
    if (restoreTasks) {
      gen.restoreGenerateVideoTask()
      gen.restoreExtractFramesTask()
    }
    return gen
  }
}
