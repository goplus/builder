import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import {
  type AnimationSettings,
  enrichAnimationSettings,
  genAnimationVideo,
  extractAnimationVideoFrames
} from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'
import type { File } from '../common/file'
import { createFileWithWebUrl, saveFileForWebUrl } from '../common/cloud'
import { Animation } from '../animation'
import { Costume } from '../costume'
import { getProjectSettings, getSpriteSettings, Phase } from './common'

// TODO: task cancelation support
export class AnimationGen extends Disposable {
  private sprite: Sprite
  private project: Project

  private enrichPhase: Phase<AnimationSettings>
  private generateVideoPhase: Phase<string>
  private extractFramesPhase: Phase<string[]>

  constructor(sprite: Sprite, project: Project, input = '') {
    super()
    this.sprite = sprite
    this.project = project
    this.input = input
    this.settings = {
      name: '',
      description: '',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      loopMode: AnimationLoopMode.NonLoopable,
      referenceFrameUrl: null
    }
    this.enrichPhase = new Phase<AnimationSettings>()
    this.generateVideoPhase = new Phase<string>()
    this.video = null
    this.extractFramesPhase = new Phase<string[]>()

    return reactive(this) as this
  }

  input: string
  setInput(input: string) {
    this.input = input
  }

  get enrichState() {
    return this.enrichPhase.state
  }
  async enrich() {
    const draft = await this.enrichPhase.run(
      enrichAnimationSettings(this.input, undefined, getSpriteSettings(this.sprite), getProjectSettings(this.project))
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

  private referenceCostumeId: string | null = null
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
    const videoUrl = await this.generateVideoPhase.run(genAnimationVideo(this.settings))
    this.setVideo(createFileWithWebUrl(videoUrl, 'TODO'))
  }

  video: File | null
  setVideo(video: File | null) {
    this.video = video
  }

  get extractFramesState() {
    return this.extractFramesPhase.state
  }
  async extractFrames() {
    const video = this.video
    if (video == null) throw new Error('Video not ready yet')
    const videoUrl = await saveFileForWebUrl(video)
    return await this.extractFramesPhase.run(extractAnimationVideoFrames(videoUrl))
  }

  async finish() {
    const frameImages = this.extractFramesPhase.state.result
    if (frameImages == null) throw new Error('Frame images expected')
    const costumes = await Promise.all(
      frameImages.map((imgUrl, i) => {
        const costumeName = `${this.settings.name}_frame_${i + 1}`
        const imgFile = createFileWithWebUrl(imgUrl, 'TODO')
        return Costume.create(costumeName, imgFile)
      })
    )
    const animation = Animation.create(this.settings.name, costumes)
    this.dispose() // TODO: Is it right to dispose here?
    return animation
  }
}
