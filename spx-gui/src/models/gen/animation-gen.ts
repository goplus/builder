import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import {
  type AnimationSettings,
  enrichAnimationSettings,
  type TaskParamsExtractVideoFrames,
  TaskType
} from '@/apis/aigc'
import type { Project } from '../project'
import { Sprite } from '../sprite'
import type { File } from '../common/file'
import { createFileWithWebUrl, saveFileForWebUrl } from '../common/cloud'
import { Animation } from '../animation'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase, Task } from './common'
import type { SpriteGen } from './sprite-gen'

export type FramesConfig = Omit<TaskParamsExtractVideoFrames, 'videoUrl'>

export class AnimationGen extends Disposable {
  id: string
  parent: Sprite | SpriteGen
  private get sprite(): Sprite {
    if (this.parent instanceof Sprite) return this.parent
    return this.parent.previewSprite
  }
  private project: Project

  private enrichPhase: Phase<AnimationSettings>
  private generateVideoTask: Task<TaskType.GenerateAnimationVideo>
  private generateVideoPhase: Phase<File>
  private extractFramesTask: Task<TaskType.ExtractVideoFrames>
  private extractFramesPhase: Phase<File[]>

  constructor(parent: Sprite | SpriteGen, project: Project, settings: Partial<AnimationSettings>) {
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
    this.referenceCostumeId = this.sprite.defaultCostume?.id ?? null
    this.enrichPhase = new Phase()
    this.generateVideoTask = new Task(TaskType.GenerateAnimationVideo)
    this.generateVideoPhase = new Phase()
    this.video = null
    this.framesConfig = null
    this.extractFramesTask = new Task(TaskType.ExtractVideoFrames)
    this.extractFramesPhase = new Phase()
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
      enrichAnimationSettings(
        this.settings.description,
        this.settings,
        getSpriteSettings(this.sprite),
        getProjectSettings(this.project)
      )
    )
    this.setSettings({
      ...draft,
      referenceFrameUrl: null // TODO: use default costume as reference frame
    })
  }

  settings: AnimationSettings
  setSettings(updates: Partial<AnimationSettings>) {
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
    const video = await this.generateVideoPhase.run(async () => {
      const costume = this.referenceCostume
      if (costume == null) throw new Error('reference costume expected')
      const referenceFrameUrl = await saveFileForWebUrl(costume.img)
      const settings = { ...this.settings, referenceFrameUrl }
      await this.generateVideoTask.start({ settings })
      const { videoUrl } = await this.generateVideoTask.untilCompleted()
      return createFileWithWebUrl(videoUrl)
    })
    this.setVideo(video)
  }

  video: File | null
  setVideo(video: File | null) {
    this.video = video
  }

  framesConfig: FramesConfig | null
  setFramesConfig(config: FramesConfig) {
    this.framesConfig = config
  }

  get extractFramesState() {
    return this.extractFramesPhase.state
  }
  async extractFrames() {
    const { video, framesConfig } = this
    if (video == null) throw new Error('video not ready yet')
    if (framesConfig == null) throw new Error('frames config not set')
    return this.extractFramesPhase.run(async () => {
      const videoUrl = await saveFileForWebUrl(video)
      await this.extractFramesTask.start({ videoUrl, ...framesConfig })
      const { frameUrls } = await this.extractFramesTask.untilCompleted()
      // Hardcode .png extension to avoid the cost of `adaptImg` in `Costume.create`.
      // TODO: Improve the file type detection in `adaptImg` to avoid this hack.
      const frames = frameUrls.map((url, i) => createFileWithWebUrl(url, `frame_${i}.png`))
      return frames
    })
  }

  result: Animation | null

  async finish() {
    const frameImgs = this.extractFramesPhase.state.result
    if (frameImgs == null) throw new Error('frame images expected')
    const costumes = await Promise.all(
      frameImgs.map((img, i) => {
        const costumeName = `${this.settings.name}_frame_${i + 1}`
        return Costume.create(costumeName, img)
      })
    )
    const animation = Animation.create(this.settings.name, costumes)
    this.result = animation
    return animation
  }

  cancel() {
    return Promise.all([this.generateVideoTask.tryCancel(), this.extractFramesTask.tryCancel()])
  }
}
