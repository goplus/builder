import { reactive } from 'vue'
import { resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import type { File, Files } from './common/file'
import { getBackdropName, validateBackdropName } from './common/asset-name'
import type { Stage } from './stage'
import { type CostumeInits, type RawCostumeConfig, Costume } from './costume'

export type BackdropInits = CostumeInits
export type RawBackdropConfig = RawCostumeConfig

const backdropAssetPath = 'assets'

// Backdrop is almost the same as Costume
export class Backdrop extends Costume {
  private stage: Stage | null = null
  setStage(stage: Stage | null) {
    this.stage = stage
  }

  setName(name: string) {
    const err = validateBackdropName(name, this.stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  constructor(name: string, file: File, inits?: BackdropInits) {
    super(name, file, inits)
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, file: File, inits?: BackdropInits) {
    const adaptedFile = await adaptImg(file)
    return new Backdrop(getBackdropName(null, nameBase), adaptedFile, {
      bitmapResolution: /svg/.test(file.type) ? 1 : 2,
      ...inits
    })
  }

  static load({ name, path, builder_id: id, ...inits }: RawBackdropConfig, files: Files) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(backdropAssetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    return new Backdrop(name, file, { ...inits, id })
  }

  export({ includeId = true }: { includeId?: boolean } = {}): [RawBackdropConfig, Files] {
    return super.export({ basePath: backdropAssetPath, includeId })
  }
}
