import { reactive } from 'vue'
import { resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import type { File, Files } from './common/file'
import { getBackdropName, validateBackdropName } from './common/asset-name'
import type { AssetMetadata } from './common/asset'
import type { Stage } from './stage'
import { type CostumeInits, type RawCostumeConfig, Costume } from './costume'

export type BackdropInits = CostumeInits & {
  assetMetadata?: AssetMetadata
}

export type RawBackdropConfig = RawCostumeConfig & {
  builder_assetMetadata?: AssetMetadata
}

const backdropAssetPath = 'assets'

export type BackdropExportLoadOptions = {
  includeId?: boolean
  includeAssetMetadata?: boolean
}

// Backdrop is almost the same as Costume
export class Backdrop extends Costume {
  stage: Stage | null = null
  setStage(stage: Stage | null) {
    this.stage = stage
  }

  setName(name: string) {
    const err = validateBackdropName(name, this.stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  assetMetadata: AssetMetadata | null
  setAssetMetadata(metadata: AssetMetadata | null) {
    this.assetMetadata = metadata
  }

  constructor(name: string, file: File, inits?: BackdropInits) {
    super(name, file, inits)
    this.assetMetadata = inits?.assetMetadata ?? null
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

  static load(
    { name, path, builder_id: id, ...inits }: RawBackdropConfig,
    files: Files,
    { includeId = true, includeAssetMetadata: includeMetadata = true }: BackdropExportLoadOptions = {}
  ) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(backdropAssetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    return new Backdrop(name, file, {
      ...inits,
      id: includeId ? id : undefined,
      assetMetadata: includeMetadata ? inits.builder_assetMetadata : undefined
    })
  }

  export({ includeId = true, includeAssetMetadata: includeMetadata = true }: BackdropExportLoadOptions = {}): [
    RawBackdropConfig,
    Files
  ] {
    const [costumeConfig, files] = super.export({ basePath: backdropAssetPath, includeId })
    let config: RawBackdropConfig = costumeConfig
    if (includeMetadata && this.assetMetadata != null) {
      config = { ...config, builder_assetMetadata: this.assetMetadata }
    }
    return [config, files]
  }
}
