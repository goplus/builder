import { join } from '@/utils/path'
import { Disposable } from './common/disposable'
import { File, toConfig, type Files } from './common/file'
import { spriteConfigFileName, type RawSpriteConfig, type Sprite } from './sprite'
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

    // load skeleton hierarchy from mesh file
    // TODO: load from spx wasm directly
    try {
      const configFile = files[join(prefix, spriteConfigFileName)]!
      const { avatar: avatarFilepath } = (await toConfig(configFile)) as RawSpriteConfig
      const avatarFile = files[join(prefix, avatarFilepath!)]
      if (avatarFile === undefined) throw new Error(`avatar file not found: ${avatarFilepath}`)
      const avatar = (await toConfig(avatarFile)) as SkeletonAvatar
      
      if (avatar.type === 'skeleton') {

        const meshFile = files[join(prefix, avatar.mesh)]
        if (meshFile === undefined) throw new Error(`mesh file not found: ${avatar.mesh}`)
          const meshConfig = (await toConfig(meshFile)) as { Hierarchy: Hierarchy[] }
        const skeleton = new Skeleton('_Root', 0, null)
        skeleton.fromHierarchy(meshConfig.Hierarchy)
        skeletonAnim.skeleton = skeleton
      }
    }
    catch (error) {
      console.error(`Error loading skeleton hierarchy, skipping:`, error)
    }

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

  private skeleton: Skeleton | null = null

  /**
   * Returns a object representing joints' world positions.
   * TODO: load from spx wasm directly
   */
  get joints(): { pos: PosRot2D, parent: number }[] {
    if (this.skeleton === null) return []
    const joints: { pos: PosRot2D, parent: number }[] = [{ pos: this.skeleton.world, parent: -1 }]
    const stack: [Skeleton, number][] = [[this.skeleton, 0]]
    while (stack.length > 0) {
      const [skeleton, parent] = stack.pop()!
      skeleton.children.forEach((child) => {
        const index = joints.length
        joints.push({ pos: child.world, parent })
        stack.push([child, index])
      })
    }
    return joints
  }
}

/**
 * Note: This is a temporary implementation of the skeleton hierarchy.
 * The structure may change in the future.
 * And we may get the skeleton hierarchy from the spx wasm directly.
 */

interface Hierarchy {
	Name: string;
	PosRot: { x: number; y: number; z: number };
	Order: number;
	Parent: string;
	color?: string;
}

type PosRot2D = { x: number; y: number; rot: number };
type Pos2D = { x: number; y: number };

class Skeleton {
	name: string;
	children: Skeleton[];
	parent: Skeleton | null;
	order: number;
	local: PosRot2D;
	world: PosRot2D;
	constructor(name: string, order: number, parent: Skeleton | null) {
		this.name = name;
		this.children = [];
		this.parent = parent;
		this.order = order;
		this.local = { x: 0, y: 0, rot: 0 };
		this.world = { x: 0, y: 0, rot: 0 };
	}
	localToWorld(local: PosRot2D) {
		const rotRad = this.world.rot * (Math.PI / 180);
		const sin = Math.sin(rotRad);
		const cos = Math.cos(rotRad);
		return {
			x: this.world.x + (cos * local.x - sin * local.y),
			y: this.world.y - (sin * local.x + cos * local.y),
			rot: this.world.rot + local.rot
		};
	}
	fromHierarchy(hierarchies: Hierarchy[]) {
		const children = hierarchies.filter((h) => h.Parent === this.name);
		// .sort((a, b) => a.Order - b.Order);
		children.forEach((child) => {
			const childSkeleton = new Skeleton(child.Name, child.Order, this);
			childSkeleton.local = { x: child.PosRot.x, y: child.PosRot.y, rot: child.PosRot.z };
			childSkeleton.world = this.localToWorld(childSkeleton.local);
			this.children.push(childSkeleton);
			childSkeleton.fromHierarchy(hierarchies);
		});
	}
}