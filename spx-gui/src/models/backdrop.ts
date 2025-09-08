import { reactive } from 'vue'
import { nanoid } from 'nanoid'
import { extname, resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import type { File, Files } from './common/file'
import { getBackdropName, validateBackdropName } from './common/asset-name'
import type { AssetMetadata } from './common/asset'
import type { Stage } from './stage'

export type BackdropInits = {
  id?: string
  bitmapResolution?: number
  assetMetadata?: AssetMetadata
}

export type RawBackdropConfig = Omit<BackdropInits, 'id' | 'assetMetadata'> & {
  builder_id?: string
  builder_assetMetadata?: AssetMetadata
  name?: string
  path?: string
}

const backdropAssetPath = 'assets'

export type BackdropExportLoadOptions = {
  includeId?: boolean
  includeAssetMetadata?: boolean
}

export class Backdrop {
  id: string

  stage: Stage | null = null
  setStage(stage: Stage | null) {
    this.stage = stage
  }

  name: string
  setName(name: string) {
    const err = validateBackdropName(name, this.stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  img: File
  setImg(img: File) {
    this.img = img
  }

  bitmapResolution: number
  setBitmapResolution(bitmapResolution: number) {
    this.bitmapResolution = bitmapResolution
  }

  assetMetadata: AssetMetadata | null
  setAssetMetadata(metadata: AssetMetadata | null) {
    this.assetMetadata = metadata
  }

  constructor(name: string, file: File, inits?: BackdropInits) {
    this.name = name
    this.img = file
    this.bitmapResolution = inits?.bitmapResolution ?? 1
    this.id = inits?.id ?? nanoid()
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

  clone(preserveId = false) {
    return new Backdrop(this.name, this.img, {
      id: preserveId ? this.id : undefined,
      bitmapResolution: this.bitmapResolution,
      assetMetadata: this.assetMetadata ?? undefined
    })
  }

  static load(
    { name, path, builder_id: id, builder_assetMetadata: assetMetadata, ...inits }: RawBackdropConfig,
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
      assetMetadata: includeMetadata ? assetMetadata : undefined
    })
  }

  export({ includeId = true, includeAssetMetadata: includeMetadata = true }: BackdropExportLoadOptions = {}): [
    RawBackdropConfig,
    Files
  ] {
    const filename = this.name + extname(this.img.name)
    const config: RawBackdropConfig = {
      bitmapResolution: this.bitmapResolution,
      name: this.name,
      path: filename
    }
    if (includeId) config.builder_id = this.id
    if (includeMetadata && this.assetMetadata != null) {
      config.builder_assetMetadata = this.assetMetadata
    }
    const files = {
      [resolve(backdropAssetPath, filename)]: this.img
    }
    return [config, files]
  }
}
