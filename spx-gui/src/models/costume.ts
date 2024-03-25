import { reactive } from 'vue'

import { extname, resolve } from '@/util/path'
import { File, type Files } from './common/file'
import { assign, type Size } from './common'

export type CostumeConfig = {
  x: number
  y: number
  faceRight: number
  bitmapResolution: number
}

export type RawCostumeConfig = Partial<CostumeConfig> & {
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

  config: CostumeConfig
  setConfig(config: Partial<CostumeConfig>) {
    assign<CostumeConfig>(this.config, config)
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
      img.onerror = e => {
        reject(new Error(`load image failed: ${e.toString()}`))
        img.remove()
      }
    })
  }
  
  constructor(name: string, file: File, config: Partial<CostumeConfig>) {
    this.name = name
    this.img = file
    this.config = {
      x: config.x ?? 0,
      y: config.y ?? 0,
      faceRight: config.faceRight ?? 0,
      bitmapResolution: config.bitmapResolution ?? 1
    }
    return reactive(this)
  }

  static load(
    { name, path, ...config }: RawCostumeConfig,
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
    return new Costume(name, file, config)
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
      ...this.config,
      name: this.name,
      path: filename
    }
    const files = {
      [resolve(basePath, filename)]: this.img
    }
    return [config, files]
  }
}
