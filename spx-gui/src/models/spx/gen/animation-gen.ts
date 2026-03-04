import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { extname } from '@/utils/path'
import { Disposable } from '@/utils/disposable'
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
import type { SpriteGen } from './sprite-gen'

export type FramesConfig = Omit<TaskParamsExtractVideoFrames, 'videoUrl'>

export type AnimationGenInits = {
  id?: string
  settings?: Partial<Omit<AnimationSettings, 'referenceFrameUrl'>>
  referenceCostumeId?: string | null
  referenceImage?: File | null
  video?: File
  framesConfig?: FramesConfig
  enrichPhase?: Phase<AnimationSettings>
  generateVideoTask?: Task<TaskType.GenerateAnimationVideo>
  generateVideoPhase?: Phase<File>
  extractFramesTask?: Task<TaskType.ExtractVideoFrames>
  finishPhase?: Phase<Animation>
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
    | 'referenceImage'
  > & {
    videoPath?: string
    referenceImagePath?: string
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
  return `${basePath}/animations/${name}`
}

export class AnimationGen extends Disposable {
  id: string
  parent: Sprite | SpriteGen
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: SpxProject

  private enrichPhase: Phase<AnimationSettings>
  private generateVideoTask: Task<TaskType.GenerateAnimationVideo> | null
  private generateVideoPhase: Phase<File>
  private extractFramesTask: Task<TaskType.ExtractVideoFrames> | null
  private finishPhase: Phase<Animation>

  constructor(parent: Sprite | SpriteGen, project: SpxProject, inits: AnimationGenInits = {}) {
    super()
    this.id = inits.id ?? nanoid()
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
    this.referenceCostumeId = inits.referenceCostumeId ?? null
    this.referenceImage = inits.referenceImage ?? null
    this.enrichPhase = inits.enrichPhase ?? new Phase({ en: 'enrich animation settings', zh: '丰富动画设置' })
    this.generateVideoTask = inits.generateVideoTask ?? null
    this.generateVideoPhase =
      inits.generateVideoPhase ?? new Phase({ en: 'generate animation video', zh: '生成动画视频' })
    this.video = inits.video ?? null
    this.framesConfig = inits.framesConfig ?? null
    this.extractFramesTask = inits.extractFramesTask ?? null
    this.finishPhase =
      inits.finishPhase ?? new Phase({ en: 'extract frames and save animation', zh: '提取帧并保存动画' })
    return reactive(this) as this
  }

  /** Get IDs for (completed) tasks. */
  getTaskIds() {
    return [this.generateVideoTask, this.extractFramesTask]
      .filter((t): t is Task<TaskType.GenerateAnimationVideo> | Task<TaskType.ExtractVideoFrames> => t != null)
      .filter((t) => t.data?.status === TaskStatus.Completed)
      .map((t) => t.data!.id)
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
        getProjectSettings(this.project)
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

  private referenceCostumeId: string | null
  get referenceCostume() {
    if (this.referenceCostumeId == null) return null
    return this.sprite.costumes.find((c) => c.id === this.referenceCostumeId) ?? null
  }
  setReferenceCostume(costumeId: string | null) {
    this.referenceCostumeId = costumeId
    if (costumeId != null) this.referenceImage = null
  }

  referenceImage: File | null = null
  setReferenceImage(file: File | null) {
    this.referenceImage = file
    if (file != null) this.referenceCostumeId = null
  }

  get generateVideoState() {
    return this.generateVideoPhase.state
  }
  async generateVideo() {
    this.setVideo(null)
    this.setFramesConfig(null)
    const video = await this.generateVideoPhase.run(async (reporter) => {
      const refImg = this.referenceImage ?? this.referenceCostume?.img ?? null
      if (refImg == null) throw new Error('reference image expected')
      const referenceFrameUrl = await saveFile(refImg)
      const settings = { ...this.settings, referenceFrameUrl }
      this.generateVideoTask?.tryCancel()
      this.generateVideoTask = new Task(TaskType.GenerateAnimationVideo)
      await this.generateVideoTask.start({ settings })
      const { videoUrl } = await this.generateVideoTask.untilCompleted(reporter)
      return createFileWithUniversalUrl(videoUrl)
    })
    this.setVideo(video)
  }
  restoreGenerateVideoTask() {
    const task = this.generateVideoTask
    if (task?.data == null || isTerminalTaskStatus(task.data.status)) return
    this.generateVideoPhase.run(async (reporter) => {
      const { videoUrl } = await task.untilCompleted(reporter)
      const video = createFileWithUniversalUrl(videoUrl)
      this.setVideo(video)
      return video
    })
  }

  video: File | null
  setVideo(video: File | null) {
    this.video = video
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
    return this.finishPhase.state.result
  }
  private async createAnimationFromFrames(frameUrls: string[]) {
    const frameImgs = frameUrls.map((url) => createFileWithUniversalUrl(url))
    const costumes = await Promise.all(
      frameImgs.map(async (img, i) => {
        const costumeName = `${this.settings.name}_frame_${i + 1}`
        const costume = await Costume.create(costumeName, img)
        await costume.autoFit()
        return costume
      })
    )
    return Animation.create(this.settings.name, costumes)
  }
  async finish() {
    const { video, framesConfig } = this
    if (video == null) throw new Error('video not ready yet')
    if (framesConfig == null) throw new Error('frames config not set')
    return this.finishPhase.run(async (reporter) => {
      const videoUrl = await saveFile(video)
      this.extractFramesTask?.tryCancel()
      this.extractFramesTask = new Task(TaskType.ExtractVideoFrames)
      await this.extractFramesTask.start({ videoUrl, ...framesConfig })
      const { frameUrls } = await this.extractFramesTask.untilCompleted(reporter)
      return this.createAnimationFromFrames(frameUrls)
    })
  }
  restoreExtractFramesTask() {
    const task = this.extractFramesTask
    if (task?.data == null || isTerminalTaskStatus(task.data.status)) return
    this.finishPhase.run(async (reporter) => {
      const { frameUrls } = await task.untilCompleted(reporter)
      return this.createAnimationFromFrames(frameUrls)
    })
  }

  /**
   * Cancel the ongoing generation/extraction if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    return Promise.all([this.generateVideoTask?.tryCancel(), this.extractFramesTask?.tryCancel()])
  }

  export(basePath = 'gen/assets'): [RawAnimationGenConfig, Files] {
    const files: Files = {}
    const assetsPath = assetsPathFor(basePath, this.name)

    const config: RawAnimationGenConfig = {
      id: this.id,
      settings: this.settings,
      referenceCostumeId: this.referenceCostumeId ?? undefined,
      framesConfig: this.framesConfig ?? undefined,
      enrichPhaseSerialized: this.enrichPhase.export(),
      generateVideoTaskSerialized: this.generateVideoTask?.export(),
      generateVideoPhaseSerialized: mapPhaseResult(this.generateVideoPhase.export(), (result) => {
        const filePath = `${assetsPath}/generated_video${extname(result.name)}`
        files[filePath] = result
        return filePath
      }),
      extractFramesTaskSerialized: this.extractFramesTask?.export(),
      finishPhaseSerialized: mapPhaseResult(this.finishPhase.export(), (result) => {
        const [animationConfig, costumeConfigs, animationFiles] = result.export(`${assetsPath}/result`, {
          sounds: [],
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

    if (this.referenceImage != null) {
      const refPath = `${assetsPath}/referenceImage${extname(this.referenceImage.name)}`
      files[refPath] = this.referenceImage
      config.referenceImagePath = refPath
    }

    return [config, files]
  }

  static load(
    parent: Sprite | SpriteGen,
    project: SpxProject,
    config: RawAnimationGenConfig,
    files: Files,
    basePath = 'gen/assets'
  ) {
    const {
      id,
      settings,
      referenceCostumeId,
      referenceImagePath,
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

    const inits: AnimationGenInits = { id: genId }
    inits.settings = settings
    if (referenceCostumeId != null) inits.referenceCostumeId = referenceCostumeId
    if (referenceImagePath != null) {
      const refFile = files[referenceImagePath]
      if (refFile != null) inits.referenceImage = refFile
    }
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
          const [animation] = Animation.load(settingsName, animationConfig, costumes, { sounds: [], includeId: true })
          return animation
        })
      )
    }
    if (videoPath != null) {
      const videoFile = files[videoPath]
      if (videoFile == null) throw new Error(`file ${videoPath} not found for animation gen ${genId}`)
      inits.video = videoFile
    }

    const gen = new AnimationGen(parent, project, inits)
    gen.restoreGenerateVideoTask()
    gen.restoreExtractFramesTask()
    return gen
  }
}
