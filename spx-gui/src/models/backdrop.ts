import { reactive } from 'vue'
import { type CostumeConfig, type RawCostumeConfig, Costume } from './costume'
import type { File, Files } from './common/file'
import { resolve } from '@/util/path'

export type BackdropConfig = CostumeConfig
export type RawBackdropConfig = RawCostumeConfig

const backdropAssetPath = 'assets'

// Backdrop is almost the same as Costume
export class Backdrop extends Costume {

  constructor(name: string, file: File, config: Partial<BackdropConfig>) {
    super(name, file, config)
    return reactive(this)
  }

  setConfig(config: Partial<BackdropConfig>) {
    super.setConfig(config)
  }

  static load({ name, path, ...config }: RawBackdropConfig, files: Files) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(backdropAssetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    return new Backdrop(name, file, config)
  }

  export(): [RawBackdropConfig, Files] {
    return super.export(backdropAssetPath)
  }
}
