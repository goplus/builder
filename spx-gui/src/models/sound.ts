import { reactive } from 'vue'
import { extname, join, resolve } from '@/utils/path'
import { File, fromConfig, type Files, listDirs, toConfig } from './common/file'
import { getSoundName, validateSoundName } from './common/asset'
import type { Project } from './project'

export type SoundInits = {
  rate?: number
  sampleCount?: number
}

export type RawSoundConfig = SoundInits & {
  path?: string
}

export const soundAssetPath = 'assets/sounds'
export const soundConfigFileName = 'index.json'

export class Sound {
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

  constructor(nameBase: string, file: File, inits?: SoundInits) {
    this.name = getSoundName(null, nameBase)
    this.file = file
    // TODO: confirm default values here
    ;(this.rate = inits?.rate ?? 0), (this.sampleCount = inits?.sampleCount ?? 0)
    return reactive(this)
  }

  static async load(name: string, files: Files) {
    const pathPrefix = join(soundAssetPath, name)
    const configFile = files[join(pathPrefix, soundConfigFileName)]
    if (configFile == null) return null
    const { path, ...inits } = (await toConfig(configFile)) as RawSoundConfig
    if (path == null) throw new Error(`path expected for sound ${name}`)
    const file = files[resolve(pathPrefix, path)]
    if (file == null) throw new Error(`file ${path} for sound ${name} not found`)
    return new Sound(name, file, inits)
  }

  static async loadAll(files: Files) {
    const soundNames = listDirs(files, soundAssetPath)
    const sounds = (await Promise.all(
      soundNames.map(async (soundName) => {
        const sound = await Sound.load(soundName, files)
        if (sound == null) console.warn('failed to load sound:', soundName)
        return sound
      })
    )).filter(s => !!s) as Sound[]
    return sounds
  }

  // config is included in files
  export(): Files {
    const filename = this.name + extname(this.file.name)
    const config: RawSoundConfig = {
      rate: this.rate,
      sampleCount: this.sampleCount,
      path: filename
    }
    const files: Files = {}
    const assetPath = join(soundAssetPath, this.name)
    files[join(assetPath, soundConfigFileName)] = fromConfig(soundConfigFileName, config)
    files[join(assetPath, filename)] = this.file
    return files
  }
}
