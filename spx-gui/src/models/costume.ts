import { reactive } from 'vue'

import { extname, resolve } from '@/utils/path'
import { File, type Files } from './common/file'
import { type Size } from './common'

export type CostumeInits = {
  x?: number
  y?: number
  faceRight?: number
  bitmapResolution?: number
}

export type RawCostumeConfig = CostumeInits & {
  name?: string
  path?: string
}

export class Costume {
  name: string
  setName(name: string) {
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

  async getSize() {
    const imgUrl = await this.img.url()
    return new Promise<Size>((resolve, reject) => {
      const img = new window.Image()
      img.src = imgUrl
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
        img.remove()
      }
      img.onerror = (e) => {
        reject(new Error(`load image failed: ${e.toString()}`))
        img.remove()
      }
    })
  }

  constructor(name: string, file: File, inits: CostumeInits) {
    this.name = name
    this.img = file
    this.x = inits.x ?? 0
    this.y = inits.y ?? 0
    this.faceRight = inits.faceRight ?? 0
    this.bitmapResolution = inits.bitmapResolution ?? 1
    return reactive(this)
  }

  static load(
    { name, path, ...inits }: RawCostumeConfig,
    files: Files,
    /**
     * Path of directory which contains the config file
     * TODO: remove me?
     */
    basePath: string
  ) {
    if (name == null) throw new Error(`name expected for costume`)
    if (path == null) throw new Error(`path expected for costume ${name}`)
    const file = files[resolve(basePath, path)]
    if (file == null) throw new Error(`file ${path} for costume ${name} not found`)
    return new Costume(name, file, inits)
  }

  export(
    /**
     * Path of directory which contains the config file
     * TODO: remove me?
     */
    basePath: string
  ): [RawCostumeConfig, Files] {
    const filename = this.name + extname(this.img.name)
    const config: RawCostumeConfig = {
      x: this.x,
      y: this.y,
      faceRight: this.faceRight,
      bitmapResolution: this.bitmapResolution,
      name: this.name,
      path: filename
    }
    const files = {
      [resolve(basePath, filename)]: this.img
    }
    return [config, files]
  }
}
