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
  /* Optional image width for engine performance optimization */
  imageWidth?: number
  /* Optional image height for engine performance optimization */
  imageHeight?: number
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
    {
      name,
      path,
      builder_id: id,
      builder_assetMetadata: assetMetadata,
      imageWidth,
      imageHeight,
      ...inits
    }: RawBackdropConfig,
    files: Files,
    { includeId = true, includeAssetMetadata = true }: BackdropExportLoadOptions = {}
  ) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(backdropAssetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    if (imageWidth != null && imageHeight != null && file.meta.imgSize == null) {
      file.meta.imgSize = { width: imageWidth, height: imageHeight }
    }
    return new Backdrop(name, file, {
      ...inits,
      id: includeId ? id : undefined,
      assetMetadata: includeAssetMetadata ? assetMetadata : undefined
    })
  }

  export({ includeId = true, includeAssetMetadata = true }: BackdropExportLoadOptions = {}): [
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
    if (includeAssetMetadata && this.assetMetadata != null) {
      config.builder_assetMetadata = this.assetMetadata
    }
    if (this.img.meta.imgSize != null) {
      const imgSize = this.img.meta.imgSize
      config.imageWidth = imgSize.width
      config.imageHeight = imgSize.height
    }
    const files = {
      [resolve(backdropAssetPath, filename)]: this.img
    }
    return [config, files]
  }
}
