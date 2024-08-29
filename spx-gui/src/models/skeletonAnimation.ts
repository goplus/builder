import { join } from '@/utils/path'
import { Disposable } from './common/disposable'
import { File, toConfig, type Files } from './common/file'
import type { Sprite } from './sprite'
import '@/utils/ispxLoader'
import { goEditorParseSpriteAnimation, goEditorParseSpriteAnimator } from '@/utils/ispxLoader'
import JSZip from 'jszip'

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

  readonly animation: SkeletonAnimation

  constructor(name: string, animation: SkeletonAnimation) {
    super()
    this.name = name
    this.animation = animation
  }

  async loadAnimFrameData() {
    const zipBlob = await this.animation.getFilesBlob()
    const buffer = await zipBlob.arrayBuffer()
    const data = await goEditorParseSpriteAnimation(
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

  constructor(name: string, clips: string[], avatar: string, files: Files, prefix: string) {
    super()
    this.name = name
    this.files = files
    this.prefix = prefix

    this.clips = clips.map((clipName) => {
      const clip = new SkeletonClip(clipName, this)
      return clip
    })

    const avatarImage = this.files[join(this.prefix, avatar)] ?? this.files[join('assets', avatar)]
    if (avatarImage === undefined) throw new Error(`avatar image not found: ${avatar}`)
    this.avatar = avatarImage
  }

  static async load(name: string, prefix: string, files: Files) {
    const zipBlob = await SkeletonAnimation.getFilesBlob(files)
    const resource = new Uint8Array(await zipBlob.arrayBuffer())
    const animator = await goEditorParseSpriteAnimator(resource, name)
    const clipsNames = animator.ClipsNames
    const avatarImage = animator.AvatarImage

    const skeletonAnim = new SkeletonAnimation(name, clipsNames, avatarImage, files, prefix)
    skeletonAnim._filesBlob = zipBlob
    return skeletonAnim
  }

  private _filesBlob: Blob | null = null
  async getFilesBlob() {
    if (this._filesBlob === null) {
      this._filesBlob = await SkeletonAnimation.getFilesBlob(this.files)
    }
    return this._filesBlob
  }

  static async getFilesBlob(files: Files) {
    const zip = new JSZip()
    await Promise.all(
      Object.keys(files).map(async (path) => {
        const content = await files[path]!.arrayBuffer()
        // the spx wasm expects files relative to the assets folder
        // so we need to remove the assets/ prefix
        if (path.startsWith('assets/')) {
          zip.file(path.slice(7), content)
        } else {
          zip.file(path, content)
        }
      })
    )
    return await zip.generateAsync({ type: 'blob' })
  }
}
