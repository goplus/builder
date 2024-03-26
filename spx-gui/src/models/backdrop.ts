import { reactive } from 'vue'
import { type CostumeInits, type RawCostumeConfig, Costume } from './costume'
import type { File, Files } from './common/file'
import { resolve } from '@/utils/path'

export type BackdropInits = CostumeInits
export type RawBackdropConfig = RawCostumeConfig

const backdropAssetPath = 'assets'

// Backdrop is almost the same as Costume
export class Backdrop extends Costume {
  constructor(name: string, file: File, inits: BackdropInits) {
    super(name, file, inits)
    return reactive(this)
  }

  static load({ name, path, ...inits }: RawBackdropConfig, files: Files) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(backdropAssetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    return new Backdrop(name, file, inits)
  }

  export(): [RawBackdropConfig, Files] {
    return super.export(backdropAssetPath)
  }
}
