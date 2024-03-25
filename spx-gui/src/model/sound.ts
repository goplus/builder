import { reactive } from 'vue'
import { File, fromConfig, type Files, listDirs, toConfig } from './common/file'
import { extname, join } from 'path'
import { assign } from './common'

export type SoundConfig = {
  rate: number
  sampleCount: number
}

export type RawSoundConfig = Partial<SoundConfig> & {
  path?: string
}

export const soundAssetPath = 'assets/sounds'
export const soundConfigFileName = 'index.json'

export class Sound {

  name: string

  file: File
  setFile(file: File) {
    this.file = file
  }

  config: SoundConfig
  setConfig(config: Partial<SoundConfig>) {
    assign<SoundConfig>(this.config, config)
  }

  constructor(name: string, file: File, config: Partial<SoundConfig>) {
    this.name = name
    this.file = file
    this.config = {
      // TODO: confirm default values here
      rate: config.rate ?? 0,
      sampleCount: config.sampleCount ?? 0
    }
    return reactive(this)
  }

  static async load(name: string, files: Files) {
    const configFile = files[join(soundAssetPath, name, soundConfigFileName)]
    if (configFile == null) return null
    const { path, ...config } = await toConfig(configFile) as RawSoundConfig
    if (path == null) throw new Error(`path expected for sound ${name}`)
    const file = files[path]
    if (file == null) throw new Error(`file ${path} for sound ${name} not found`)
    return new Sound(name, file, config)
  }

  static async loadAll(files: Files) {
    const soundNames = listDirs(files, soundAssetPath)
    const sounds: Sound[] = []
    await Promise.all(soundNames.map(async soundName => {
      const sound = await Sound.load(soundName, files)
      if (sound == null) {
        console.warn('failed to load sound:', soundName)
        return
      }
      sounds.push(sound)
    }))
    return sounds
  }

  // config is included in files
  export(): Files {
    const filename = this.name + extname(this.file.name)
    const config: RawSoundConfig = {
      ...this.config,
      path: filename
    }
    const files: Files = {}
    const assetPath = join(soundAssetPath, this.name)
    files[join(assetPath, soundConfigFileName)] = fromConfig(soundConfigFileName, config)
    files[join(assetPath, filename)] = this.file
    return files
  }
}
