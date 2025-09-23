import { reactive } from 'vue'
import { nanoid } from 'nanoid'

import { extname, resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import { File, type Files, getImageSize } from './common/file'
import { getCostumeName, validateCostumeName } from './common/asset-name'
import type { Sprite } from './sprite'
import type { Animation } from './animation'

/** Offset of the costume’s pivot from the top-left corner of the image. */
export type Pivot = {
  /** The x offset. Positive value means right direction, negative means left direction. */
  x: number
  /** The y offset. Positive value means down direction, negative means up direction. */
  y: number
}

export type CostumeInits = {
  id?: string
  /**
   * Offset of the costume’s pivot from the top-left corner of the image.
   * Note: This value is relative to the costume's final size and is already divided by bitmapResolution;
   * for example, if the image is 200x200 and bitmapResolution is 2, then a pivot of (50, 50) represents the image center.
   */
  pivot?: Pivot
  faceRight?: number
  bitmapResolution?: number
}

export type RawCostumeConfig = Omit<CostumeInits, 'id' | 'pivot'> & {
  /**
   * Offset on x-axis of the costume pivot from left-top corner of the image.
   * Positive value means right direction, negative means left direction.
   * Note: This value is relative to the costume's raw size and is not divided by bitmapResolution;
   */
  x?: number
  /**
   * Offset on y-axis of the costume pivot from left-top corner of the image.
   * Positive value means down direction, negative means up direction.
   * Note: This value is relative to the costume's raw size and is not divided by bitmapResolution;
   */
  y?: number
  builder_id?: string
  name?: string
  path?: string
}

export type CostumeExportLoadOptions = {
  /** Path of directory which contains the sprite's config file */
  basePath: string
  includeId?: boolean
  namePrefix?: string
}

export class Costume {
  id: string

  parent: Sprite | Animation | null = null
  setParent(parent: Sprite | Animation | null) {
    this.parent = parent
  }

  name: string
  setName(name: string) {
    const err = validateCostumeName(name, this.parent)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  img: File
  setImg(img: File) {
    this.img = img
  }

  /**
   * Offset of the costume’s pivot from the top-left corner of the image.
   * Note: This value is relative to the costume's final size and is already divided by bitmapResolution;
   * for example, if the image is 200x200 and bitmapResolution is 2, then a pivot of (50, 50) represents the image center.
   */
  pivot: Pivot
  setPivot(pivot: Pivot) {
    this.pivot = pivot
  }

  faceRight: number
  setFaceRight(faceRight: number) {
    this.faceRight = faceRight
  }

  bitmapResolution: number
  setBitmapResolution(bitmapResolution: number) {
    this.bitmapResolution = bitmapResolution
  }

  async getRawSize() {
    return getImageSize(this.img)
  }

  async getSize() {
    const rawSize = await this.getRawSize()
    return {
      width: rawSize.width / this.bitmapResolution,
      height: rawSize.height / this.bitmapResolution
    }
  }

  constructor(name: string, file: File, inits?: CostumeInits) {
    this.name = name
    this.img = file
    this.pivot = inits?.pivot ?? { x: 0, y: 0 }
    this.faceRight = inits?.faceRight ?? 0
    this.bitmapResolution = inits?.bitmapResolution ?? 1
    this.id = inits?.id ?? nanoid()
    return reactive(this) as this
  }

  clone(preserveId = false) {
    return new Costume(this.name, this.img, {
      id: preserveId ? this.id : undefined,
      pivot: this.pivot,
      faceRight: this.faceRight,
      bitmapResolution: this.bitmapResolution
    })
  }

  /**
   * Set pivot (x, y) automatically based on the image size.
   * TODO: review the relation between `autoFit` & `Costume.create`
   */
  async autoFit() {
    const size = await this.getSize()
    this.setPivot({
      x: size.width / 2,
      y: size.height / 2
    })
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, file: File, inits?: CostumeInits) {
    const adaptedFile = await adaptImg(file)
    return new Costume(getCostumeName(null, nameBase), adaptedFile, {
      bitmapResolution: /svg/.test(file.type) ? 1 : 2,
      ...inits
    })
  }

  static load(
    { builder_id: id, name, path, x = 0, y = 0, bitmapResolution = 1, ...inits }: RawCostumeConfig,
    files: Files,
    { basePath, includeId }: CostumeExportLoadOptions
  ) {
    if (name == null) throw new Error(`name expected for costume`)
    if (path == null) throw new Error(`path expected for costume ${name}`)
    const file = files[resolve(basePath, path)]
    if (file == null) throw new Error(`file ${path} for costume ${name} not found`)
    return new Costume(name, file, {
      ...inits,
      bitmapResolution,
      pivot: {
        x: x / bitmapResolution,
        y: y / bitmapResolution
      },
      id: includeId ? id : undefined
    })
  }

  export({ basePath, includeId = true, namePrefix = '' }: CostumeExportLoadOptions): [RawCostumeConfig, Files] {
    const name = namePrefix + this.name
    const filename = name + extname(this.img.name)
    const config: RawCostumeConfig = {
      x: this.pivot.x * this.bitmapResolution,
      y: this.pivot.y * this.bitmapResolution,
      faceRight: this.faceRight,
      bitmapResolution: this.bitmapResolution,
      name,
      path: filename
    }
    if (includeId) config.builder_id = this.id
    const files = {
      [resolve(basePath, filename)]: this.img
    }
    return [config, files]
  }
}
