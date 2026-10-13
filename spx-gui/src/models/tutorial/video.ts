import { nanoid } from 'nanoid'
import { computed, reactive, toValue, type ComputedRef } from 'vue'

import { extname, join, resolve } from '@/utils/path'
import { fromConfig, listDirs, toConfig, type File, type Files } from '@/models/common/file'

import { validateVideoName } from './asset-name'
import type { TutorialProject } from './project'

export type VideoInits = {
  id?: string
}

export type RawVideoConfig = Omit<VideoInits, 'id'> & {
  builder_id?: string
  path?: string
}

export const videoAssetPath = 'assets/videos'
const videoConfigFileName = 'index.json'

export class Video {
  id: string

  _project: TutorialProject | null = null
  setProject(project: TutorialProject | null) {
    this._project = project
  }

  name: string
  setName(name: string) {
    const error = validateVideoName(name, this._project)
    if (error != null) throw new Error(`invalid video name ${name}: ${error.en}`)
    this.name = name
  }

  file: File
  setFile(file: File) {
    this.file = file
  }

  /** The payload is stored under the video's name, keeping its own extension. */
  private get filename() {
    return this.name + extname(this.file.name)
  }

  // Kept as the same `File` while the video is unchanged, so that exports can be compared by identity.
  private configFile: ComputedRef<File>

  constructor(name: string, file: File, inits?: VideoInits) {
    this.id = inits?.id ?? nanoid()
    this.name = name
    this.file = file
    const reactiveThis = reactive(this) as this
    this.configFile = computed(() => {
      const config: RawVideoConfig = { path: reactiveThis.filename, builder_id: reactiveThis.id }
      return fromConfig(videoConfigFileName, config)
    })
    return reactiveThis
  }

  static async load(name: string, files: Files) {
    const pathPrefix = join(videoAssetPath, name)
    const configFile = files[join(pathPrefix, videoConfigFileName)]
    if (configFile == null) return null
    const { builder_id: id, path } = (await toConfig(configFile)) as RawVideoConfig
    if (path == null) throw new Error(`path expected for video ${name}`)
    const file = files[resolve(pathPrefix, path)]
    if (file == null) throw new Error(`file ${path} for video ${name} not found`)
    return new Video(name, file, { id })
  }

  static async loadAll(files: Files) {
    const names = listDirs(files, videoAssetPath)
    const videos = (await Promise.all(names.map((name) => Video.load(name, files)))).filter((video) => video != null)
    return videos as Video[]
  }

  export(): Files {
    const assetPath = join(videoAssetPath, this.name)
    return {
      [join(assetPath, videoConfigFileName)]: toValue(this.configFile),
      [join(assetPath, this.filename)]: this.file
    }
  }
}
