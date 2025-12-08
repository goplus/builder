import { reactive } from 'vue'
import { extname, join, resolve } from '@/utils/path'
import { adaptAudio } from '@/utils/spx'
import { Disposable } from '@/utils/disposable'
import { File, fromConfig, type Files, listDirs, toConfig } from './common/file'
import { getSoundName, validateSoundName } from './common/asset-name'
import type { AssetMetadata } from './common/asset'
import type { Project } from './project'
import { nanoid } from 'nanoid'

export type SoundInits = {
  id?: string
  rate?: number
  sampleCount?: number
  assetMetadata?: AssetMetadata
  /** Additional config not recognized by builder */
  extraConfig?: object
}

export type RawSoundConfig = Omit<SoundInits, 'id' | 'assetMetadata' | 'extraConfig'> & {
  builder_id?: string
  builder_assetMetadata?: AssetMetadata
  path?: string
}

export const soundAssetPath = 'assets/sounds'
export const soundConfigFileName = 'index.json'

export type SoundExportLoadOptions = {
  includeId?: boolean
  includeAssetMetadata?: boolean
}

export class Sound extends Disposable {
  id: string

  _project: Project | null = null
  setProject(project: Project | null) {
    this._project = project
  }

  name: string
  setName(name: string) {
    const err = validateSoundName(name, this._project)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  file: File
  setFile(file: File) {
    this.file = file
  }

  rate: number
  setRate(rate: number) {
    this.rate = rate
  }

  sampleCount: number
  setSampleCount(sampleCount: number) {
    this.sampleCount = sampleCount
  }

  assetMetadata: AssetMetadata | null
  setAssetMetadata(metadata: AssetMetadata | null) {
    this.assetMetadata = metadata
  }

  extraConfig: object
  setExtraConfig(extraConfig: object) {
    this.extraConfig = extraConfig
  }

  constructor(name: string, file: File, inits?: SoundInits) {
    super()
    this.name = name
    this.file = file
    this.rate = inits?.rate ?? 0
    this.sampleCount = inits?.sampleCount ?? 0
    this.id = inits?.id ?? nanoid()
    this.assetMetadata = inits?.assetMetadata ?? null
    this.extraConfig = inits?.extraConfig ?? {}
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, file: File, inits?: SoundInits) {
    const adaptedFile = await adaptAudio(file)
    return new Sound(getSoundName(null, nameBase), adaptedFile, inits)
  }

  static async load(
    name: string,
    files: Files,
    { includeId = true, includeAssetMetadata = true }: SoundExportLoadOptions = {}
  ) {
    const pathPrefix = join(soundAssetPath, name)
    const configFile = files[join(pathPrefix, soundConfigFileName)]
    if (configFile == null) return null
    const {
      builder_id: id,
      builder_assetMetadata: metadata,
      path,
      rate,
      sampleCount,
      ...extraConfig
    } = (await toConfig(configFile)) as RawSoundConfig
    if (path == null) throw new Error(`path expected for sound ${name}`)
    const file = files[resolve(pathPrefix, path)]
    if (file == null) throw new Error(`file ${path} for sound ${name} not found`)
    return new Sound(name, file, {
      id: includeId ? id : undefined,
      rate,
      sampleCount,
      assetMetadata: includeAssetMetadata ? metadata : undefined,
      extraConfig
    })
  }

  clone(preserveId = false) {
    return new Sound(this.name, this.file, {
      id: preserveId ? this.id : undefined,
      rate: this.rate,
      sampleCount: this.sampleCount,
      assetMetadata: this.assetMetadata ?? undefined,
      extraConfig: this.extraConfig
    })
  }

  static async loadAll(files: Files, options?: SoundExportLoadOptions) {
    const soundNames = listDirs(files, soundAssetPath)
    const sounds = (
      await Promise.all(
        soundNames.map(async (soundName) => {
          const sound = await Sound.load(soundName, files, options)
          if (sound == null) console.warn('failed to load sound:', soundName)
          return sound
        })
      )
    ).filter((s) => !!s) as Sound[]
    return sounds
  }

  // config is included in files
  export({ includeId = true, includeAssetMetadata = true }: SoundExportLoadOptions = {}): Files {
    const filename = this.name + extname(this.file.name)
    const config: RawSoundConfig = {
      rate: this.rate,
      sampleCount: this.sampleCount,
      path: filename,
      ...this.extraConfig
    }
    if (includeId) config.builder_id = this.id
    if (includeAssetMetadata && this.assetMetadata != null) config.builder_assetMetadata = this.assetMetadata
    const files: Files = {}
    const assetPath = join(soundAssetPath, this.name)
    files[join(assetPath, soundConfigFileName)] = fromConfig(soundConfigFileName, config)
    files[join(assetPath, filename)] = this.file
    return files
  }
}
