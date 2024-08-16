import { join } from '@/utils/path'
import { Disposable } from './common/disposable'
import { File, toConfig, type Files } from './common/file'
import type { Sprite } from './sprite'
import '@/utils/ispxLoader'
import { goParseSkeletonAnimData } from '@/utils/ispxLoader'
import JSZip from 'jszip'

export interface SkeletonAnimationInitConfig {
  name: string
  animatorFilepath: string
  avatarFilepath: string
  prefix: string
  files: Files
}

export interface SkeletonAnimator {
  type: string
  defaultClip: string
  clips: {
    name: string
    loop: boolean
    frameRate: number
    path: string
  }[]
}

export interface SkeletonAvatar {
  type: string
  image: string
  mesh: string
  scale: { x: number; y: number }
  offset: { x: number; y: number }
}
export class SkeletonClip extends Disposable {
  readonly name: string
  readonly loop: boolean
  readonly frameRate: number

  readonly animation: SkeletonAnimation

  constructor(name: string, loop: boolean, frameRate: number, animation: SkeletonAnimation) {
    super()
    this.name = name
    this.loop = loop
    this.frameRate = frameRate
    this.animation = animation
  }

  async loadAnimFrameData() {
    const zipBlob = await this.animation.getFilesBlob()
    const buffer = await zipBlob.arrayBuffer()
    const data = await goParseSkeletonAnimData(
      new Uint8Array(buffer),
      this.animation.name,
      this.name
    )
    return data
  }
}

export class SkeletonAnimation extends Disposable {
  readonly name: string
  
  private sprite: Sprite | null = null
  setSprite(sprite: Sprite | null) {
    this.sprite = sprite
  }
  private files: Files
  private prefix: string

  clips: SkeletonClip[] = []
  defaultClip: SkeletonClip | null = null
  avatar: File
  scale: { x: number; y: number } = { x: 1, y: 1 }
  offset: { x: number; y: number } = { x: 0, y: 0 }

  constructor(
    name: string,
    animator: SkeletonAnimator,
    avatar: SkeletonAvatar,
    files: Files,
    prefix: string
  ) {
    super()
    this.name = name
    this.files = files
    this.prefix = prefix

    this.clips = animator.clips.map(({ name, loop, frameRate }) => {
      const clip = new SkeletonClip(name, loop, frameRate, this)
      if (name === animator.defaultClip) this.defaultClip = clip
      return clip
    })

    const avatarImage = this.files[join(this.prefix, avatar.image)]
    if (avatarImage === undefined) throw new Error(`avatar image not found: ${avatar.image}`)
    this.avatar = avatarImage
    this.scale = avatar.scale
    this.offset = avatar.offset
  }

  static async load({
    name,
    animatorFilepath,
    avatarFilepath,
    prefix,
    files
  }: SkeletonAnimationInitConfig) {
    const animatorFile = files[join(prefix, animatorFilepath)]
    const avatarFile = files[join(prefix, avatarFilepath)]

    if (animatorFile === undefined) throw new Error(`animator file not found: ${animatorFilepath}`)
    if (avatarFile === undefined) throw new Error(`avatar file not found: ${avatarFilepath}`)

    const animator = (await toConfig(animatorFile)) as SkeletonAnimator
    const avatar = (await toConfig(avatarFile)) as SkeletonAvatar

    if (animator.type !== 'skeleton' || avatar.type !== 'skeleton') {
      throw new Error(`invalid animator type: ${animator.type}`)
    }

    return new SkeletonAnimation(name, animator, avatar, files, prefix)
  }

  private _filesBlob: Blob | null = null
  async getFilesBlob() {
    if (this._filesBlob === null) {
      const zip = new JSZip()
      await Promise.all(
        Object.keys(this.files).map(async (path) => {
          const content = await this.files[path]!.arrayBuffer()
          // the spx wasm expects files relative to the assets folder
          // so we need to remove the assets/ prefix
          if (path.startsWith('assets/')) {
            zip.file(path.slice(7), content)
          } else {
            zip.file(path, content)
          }
        })
      )
      this._filesBlob = await zip.generateAsync({ type: 'blob' })
    }
    return this._filesBlob
  }
}
