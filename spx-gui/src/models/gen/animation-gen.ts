import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { Prettify } from '@/utils/types'
import { Disposable } from '@/utils/disposable'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import {
  type AnimationSettings,
  enrichAnimationSettings,
  type TaskParamsExtractVideoFrames,
  TaskType,
  TaskStatus
} from '@/apis/aigc'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import type { File } from '../common/file'
import { ensureValidAnimationName, validateAnimationName } from '../common/asset-name'
import { createFileWithUniversalUrl, saveFile } from '../common/cloud'
import { Animation } from '../animation'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase, Task } from './common'
import type { SpriteGen } from './sprite-gen'

export type FramesConfig = Omit<TaskParamsExtractVideoFrames, 'videoUrl'>

export type AnimationGenInits = Prettify<
  Partial<
    Omit<AnimationSettings, 'referenceFrameUrl'> & {
      referenceCostumeId: string | null
    }
  >
>

export class AnimationGen extends Disposable {
  id: string
  parent: Sprite | SpriteGen
  get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: Project

  private enrichPhase: Phase<AnimationSettings>
  private generateVideoTask: Task<TaskType.GenerateAnimationVideo>
  private generateVideoPhase: Phase<File>
  private extractFramesTask: Task<TaskType.ExtractVideoFrames>
  private extractFramesPhase: Phase<File[]>
  private finishPhase: Phase<Animation>

  constructor(
    parent: Sprite | SpriteGen,
    project: Project,
    { referenceCostumeId = null, ...settings }: AnimationGenInits
  ) {
    super()
    this.id = nanoid()
    this.parent = parent
    this.project = project
    this.settings = {
      name: '',
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      loopMode: AnimationLoopMode.NonLoopable,
      referenceFrameUrl: null,
      ...settings
    }
    this.referenceCostumeId = referenceCostumeId
    this.enrichPhase = new Phase({ en: 'enrich animation settings', zh: '丰富动画设置' })
    this.generateVideoTask = new Task(TaskType.GenerateAnimationVideo)
    this.generateVideoPhase = new Phase({ en: 'generate animation video', zh: '生成动画视频' })
    this.video = null
    this.framesConfig = null
    this.extractFramesTask = new Task(TaskType.ExtractVideoFrames)
    this.extractFramesPhase = new Phase({ en: 'extract video frames', zh: '提取视频帧' })
    this.finishPhase = new Phase({ en: 'save animation', zh: '保存动画' })
    return reactive(this) as this
  }

  /** Get task IDs for completed tasks only. Only completed task IDs will be returned. */
  getTaskIds() {
    return [this.generateVideoTask, this.extractFramesTask]
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
  }

  get generateVideoState() {
    return this.generateVideoPhase.state
  }
  async generateVideo() {
    this.setVideo(null)
    this.setFramesConfig(null)
    const video = await this.generateVideoPhase.run(async () => {
      const costume = this.referenceCostume
      if (costume == null) throw new Error('reference costume expected')
      const referenceFrameUrl = await saveFile(costume.img)
      const settings = { ...this.settings, referenceFrameUrl }
      await this.generateVideoTask.start({ settings })
      const { videoUrl } = await this.generateVideoTask.untilCompleted()
      return createFileWithUniversalUrl(videoUrl)
    }, this.generateVideoTask.runDuration)
    this.setVideo(video)
  }

  video: File | null
  setVideo(video: File | null) {
    this.video = video
  }

  framesConfig: FramesConfig | null
  setFramesConfig(config: FramesConfig | null) {
    this.framesConfig = config
  }

  get extractFramesState() {
    return this.extractFramesPhase.state
  }
  resetExtractFramesState() {
    this.extractFramesPhase.reset()
  }
  async extractFrames() {
    const { video, framesConfig } = this
    if (video == null) throw new Error('video not ready yet')
    if (framesConfig == null) throw new Error('frames config not set')
    return this.extractFramesPhase.run(async () => {
      const videoUrl = await saveFile(video)
      await this.extractFramesTask.start({ videoUrl, ...framesConfig })
      const { frameUrls } = await this.extractFramesTask.untilCompleted()
      const frames = frameUrls.map((url) => createFileWithUniversalUrl(url))
      return frames
    })
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
    const frameImgs = this.extractFramesPhase.state.result
    if (frameImgs == null) throw new Error('frame images expected')
    return this.finishPhase.run(async () => {
      const costumes = await Promise.all(
        frameImgs.map(async (img, i) => {
          const costumeName = `${this.settings.name}_frame_${i + 1}`
          const costume = await Costume.create(costumeName, img)
          await costume.autoFit()
          return costume
        })
      )
      return Animation.create(this.settings.name, costumes)
    })
  }

  /**
   * Cancel the ongoing generation/extraction if any.
   * Note:
   * - The cancellation requests will not be aborted even if this gen instance is disposed.
   * - No exception will be thrown even if the cancellation requests fail.
   */
  cancel() {
    return Promise.all([this.generateVideoTask.tryCancel(), this.extractFramesTask.tryCancel()])
  }
}
