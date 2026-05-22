import { reactive } from 'vue'
import { nanoid } from 'nanoid'
import { isSvgMimeType } from '@/utils/file'
import { extname, resolve } from '@/utils/path'
import { adaptImg } from '@/utils/spx'
import { getImageSize, type File, type Files } from '../common/file'
import { getBackdropName, validateBackdropName } from './common/asset-name'
import type { AssetMetadata } from './common/asset'
import type { Pivot } from './costume'
import type { Stage } from './stage'

export type BackdropInits = {
  id?: string
  pivot?: Pivot
  bitmapResolution?: number
  assetMetadata?: AssetMetadata
}

export type RawBackdropConfig = Omit<BackdropInits, 'id' | 'assetMetadata' | 'pivot'> & {
  x?: number
  y?: number
  builder_id?: string
  builder_assetMetadata?: AssetMetadata
  name?: string
  path?: string
  /* Optional image width for engine performance optimization */
  imageWidth?: number
  /* Optional image height for engine performance optimization */
  imageHeight?: number
  /**
   * @deprecated Legacy compatibility field produced by old Builder backdrop export behavior
   * that reused costume logic. This is not part of SPX behavior/spec.
   * Used only when loading historical Builder data.
   */
  faceRight?: number
}

const backdropAssetPath = 'assets'

export type BackdropExportLoadOptions = {
  includeId?: boolean
  includeAssetMetadata?: boolean
  /** Path of directory which contains the backdrop's asset (image) file. Defaults to 'assets' */
  assetPath?: string
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

  pivot: Pivot
  setPivot(pivot: Pivot) {
    this.pivot = pivot
  }

  bitmapResolution: number
  setBitmapResolution(bitmapResolution: number) {
    this.bitmapResolution = bitmapResolution
  }

  async getRawSize() {
    return getImageSize(this.img)
  }

  async getSize() {
    const rawSize = await this.getRawSize()
    return {
      width: rawSize.width / this.bitmapResolution,
      height: rawSize.height / this.bitmapResolution
    }
  }

  assetMetadata: AssetMetadata | null
  setAssetMetadata(metadata: AssetMetadata | null) {
    this.assetMetadata = metadata
  }

  constructor(name: string, file: File, inits?: BackdropInits) {
    this.name = name
    this.img = file
    this.pivot = inits?.pivot ?? { x: 0, y: 0 }
    this.bitmapResolution = inits?.bitmapResolution ?? 1
    this.id = inits?.id ?? nanoid()
    this.assetMetadata = inits?.assetMetadata ?? null
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, file: File, { bitmapResolution, pivot, ...extraInits }: BackdropInits = {}) {
    const adaptedFile = await adaptImg(file)
    if (bitmapResolution == null) {
      bitmapResolution = isSvgMimeType(file.type) ? 1 : 2
    }
    if (pivot == null) {
      const size = await getImageSize(adaptedFile)
      pivot = {
        x: size.width / bitmapResolution / 2,
        y: size.height / bitmapResolution / 2
      }
    }
    return new Backdrop(getBackdropName(null, nameBase), adaptedFile, {
      ...extraInits,
      bitmapResolution,
      pivot
    })
  }

  clone(preserveId = false) {
    return new Backdrop(this.name, this.img, {
      id: preserveId ? this.id : undefined,
      pivot: this.pivot,
      bitmapResolution: this.bitmapResolution,
      assetMetadata: this.assetMetadata ?? undefined
    })
  }

  static async load(
    {
      name,
      path,
      x,
      y,
      faceRight,
      bitmapResolution = 1,
      builder_id: id,
      builder_assetMetadata: assetMetadata,
      imageWidth,
      imageHeight,
      ...inits
    }: RawBackdropConfig,
    files: Files,
    { includeId = true, includeAssetMetadata = true, assetPath = backdropAssetPath }: BackdropExportLoadOptions = {}
  ) {
    if (name == null) throw new Error(`name expected for backdrop`)
    if (path == null) throw new Error(`path expected for backdrop ${name}`)
    const file = files[resolve(assetPath, path)]
    if (file == null) throw new Error(`file ${path} for backdrop ${name} not found`)
    if (imageWidth != null && imageHeight != null && file.meta.imgSize == null) {
      file.meta.imgSize = { width: imageWidth, height: imageHeight }
    }
    // Compatibility: some legacy backdrop data was exported via costume logic and may carry
    // meaningless x/y = 0 together with a numeric faceRight. In this case, ignore x/y and
    // derive pivot from image size.
    const isLegacyMeaninglessPivot = typeof faceRight === 'number' && x === 0 && y === 0
    const usePivotFromConfig = x != null && y != null && !isLegacyMeaninglessPivot
    let pivot: Pivot
    if (usePivotFromConfig) {
      pivot = { x: x / bitmapResolution, y: y / bitmapResolution }
    } else {
      const size = await getImageSize(file)
      pivot = {
        x: size.width / bitmapResolution / 2,
        y: size.height / bitmapResolution / 2
      }
    }
    return new Backdrop(name, file, {
      ...inits,
      bitmapResolution,
      pivot,
      id: includeId ? id : undefined,
      assetMetadata: includeAssetMetadata ? assetMetadata : undefined
    })
  }

  export({
    includeId = true,
    includeAssetMetadata = true,
    assetPath = backdropAssetPath
  }: BackdropExportLoadOptions = {}): [RawBackdropConfig, Files] {
    const filename = this.name + extname(this.img.name)
    const config: RawBackdropConfig = {
      x: this.pivot.x * this.bitmapResolution,
      y: this.pivot.y * this.bitmapResolution,
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
      [resolve(assetPath, filename)]: this.img
    }
    return [config, files]
  }
}
