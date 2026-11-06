import { nanoid } from 'nanoid'
import { computed, reactive, toValue, type ComputedRef } from 'vue'

import { extname, join, resolve } from '@/utils/path'
import { fromConfig, listDirs, toConfig, type File, type Files } from '@/models/common/file'

import { validateImageName } from './asset-name'
import type { TutorialProject } from './project'

export type ImageInits = {
  id?: string
}

export type RawImageConfig = Omit<ImageInits, 'id'> & {
  builder_id?: string
  path?: string
}

export const imageAssetPath = 'assets/images'
const imageConfigFileName = 'index.json'

export class Image {
  id: string

  _project: TutorialProject | null = null
  setProject(project: TutorialProject | null) {
    this._project = project
  }

  name: string
  setName(name: string) {
    const error = validateImageName(name, this._project)
    if (error != null) throw new Error(`invalid image name ${name}: ${error.en}`)
    this.name = name
  }

  file: File
  setFile(file: File) {
    this.file = file
  }

  /** The payload is stored under the image's name, keeping its own extension. */
  private get filename() {
    return this.name + extname(this.file.name)
  }

  // Kept as the same `File` while the image is unchanged, so that exports can be compared by identity.
  private configFile: ComputedRef<File>

  constructor(name: string, file: File, inits?: ImageInits) {
    this.id = inits?.id ?? nanoid()
    this.name = name
    this.file = file
    const reactiveThis = reactive(this) as this
    this.configFile = computed(() => {
      const config: RawImageConfig = { path: reactiveThis.filename, builder_id: reactiveThis.id }
      return fromConfig(imageConfigFileName, config)
    })
    return reactiveThis
  }

  static async load(name: string, files: Files) {
    const pathPrefix = join(imageAssetPath, name)
    const configFile = files[join(pathPrefix, imageConfigFileName)]
    if (configFile == null) return null
    const { builder_id: id, path } = (await toConfig(configFile)) as RawImageConfig
    if (path == null) throw new Error(`path expected for image ${name}`)
    const file = files[resolve(pathPrefix, path)]
    if (file == null) throw new Error(`file ${path} for image ${name} not found`)
    return new Image(name, file, { id })
  }

  static async loadAll(files: Files) {
    const names = listDirs(files, imageAssetPath)
    const images = (await Promise.all(names.map((name) => Image.load(name, files)))).filter((image) => image != null)
    return images as Image[]
  }

  export(): Files {
    const assetPath = join(imageAssetPath, this.name)
    return {
      [join(assetPath, imageConfigFileName)]: toValue(this.configFile),
      [join(assetPath, this.filename)]: this.file
    }
  }
}
