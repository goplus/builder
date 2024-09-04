import { reactive } from 'vue'
import { nanoid } from 'nanoid'

import { extname, resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import { Disposable } from '@/utils/disposable'
import { File, type Files } from './common/file'
import type { Size } from './common'
import { getCostumeName, validateCostumeName } from './common/asset-name'
import type { Sprite } from './sprite'
import type { Animation } from './animation'

export type CostumeInits = {
  id?: string
  x?: number
  y?: number
  faceRight?: number
  bitmapResolution?: number
}

export type RawCostumeConfig = Omit<CostumeInits, 'id'> & {
  builder_id?: string
  name?: string
  path?: string
}

export class Costume {
  id: string

  private parent: Sprite | Animation | null = null
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

  x: number
  setX(x: number) {
    this.x = x
  }

  y: number
  setY(y: number) {
    this.y = y
  }

  faceRight: number
  setFaceRight(faceRight: number) {
    this.faceRight = faceRight
  }

  bitmapResolution: number
  setBitmapResolution(bitmapResolution: number) {
    this.bitmapResolution = bitmapResolution
  }

  private async getRawSize() {
    const d = new Disposable()
    const imgUrl = await this.img.url((fn) => d.addDisposer(fn))
    return new Promise<Size>((resolve, reject) => {
      const img = new window.Image()
      img.src = imgUrl
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      img.onerror = (e) => {
        reject(new Error(`load image failed: ${e.toString()}`))
      }
    }).finally(() => {
      d.dispose()
    })
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
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.faceRight = inits?.faceRight ?? 0
    this.bitmapResolution = inits?.bitmapResolution ?? 1
    this.id = inits?.id ?? nanoid()
    return reactive(this) as this
  }

  clone() {
    return new Costume(this.name, this.img, {
      x: this.x,
      y: this.y,
      faceRight: this.faceRight,
      bitmapResolution: this.bitmapResolution
    })
  }

  /**
   * Adjust position to fit current sprite
   * TODO: review the relation between `autoFit` & `Costume.create` / `Sprite addCostume`
   */
  async autoFit() {
    if (this.parent == null) throw new Error(`parent required to autoFit costume ${this.name}`)
    const reference = this.parent.costumes[0]
    if (reference == null || reference === this) return
    const [referenceSize, size] = await Promise.all([reference.getRawSize(), this.getRawSize()])
    this.setX(reference.x + (size.width - referenceSize.width) / 2)
    this.setY(reference.y + (size.height - referenceSize.height) / 2)
  }

  /**
   * Create instance with default inits
   * Note that the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, file: File, inits?: CostumeInits) {
    const adaptedFile = await adaptImg(file)
    return new Costume(getCostumeName(null, nameBase), adaptedFile, {
      bitmapResolution: /svg/.test(file.type) ? 1 : 2,
      ...inits
    })
  }

  static load(
    { builder_id: id, name, path, ...inits }: RawCostumeConfig,
    files: Files,
    /** Path of directory which contains the sprite's config file */
    basePath: string
  ) {
    if (name == null) throw new Error(`name expected for costume`)
    if (path == null) throw new Error(`path expected for costume ${name}`)
    const file = files[resolve(basePath, path)]
    if (file == null) throw new Error(`file ${path} for costume ${name} not found`)
    return new Costume(name, file, { ...inits, id })
  }

  export({
    basePath,
    includeId = true,
    namePrefix = ''
  }: {
    /** Path of directory which contains the sprite's config file */
    basePath: string
    includeId?: boolean
    namePrefix?: string
  }): [RawCostumeConfig, Files] {
    const name = namePrefix + this.name
    const filename = name + extname(this.img.name)
    const config: RawCostumeConfig = {
      x: this.x,
      y: this.y,
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
