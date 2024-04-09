import { reactive } from 'vue'
import { type CostumeInits, type RawCostumeConfig, Costume } from './costume'
import type { File, Files } from './common/file'
import { resolve } from '@/utils/path'
import { getBackdropName, validateBackdropName } from './common/asset'
import type { Stage } from './stage'

export type BackdropInits = CostumeInits
export type RawBackdropConfig = RawCostumeConfig

const backdropAssetPath = 'assets'

// Backdrop is almost the same as Costume
export class Backdrop extends Costume {
  _stage: Stage | null = null
  setStage(stage: Stage | null) {
    this._stage = stage
  }

  setName(name: string) {
    const err = validateBackdropName(name, this._stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  constructor(nameBase: string, file: File, inits?: BackdropInits) {
    nameBase = getBackdropName(null, nameBase)
    super(nameBase, file, inits)
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
