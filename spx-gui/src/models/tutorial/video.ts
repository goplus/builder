import { nanoid } from 'nanoid'
import { reactive } from 'vue'

import { extname, join, resolve } from '@/utils/path'
import type { LocaleMessage } from '@/utils/i18n'
import { getStringLengthInCodePoints } from '@/utils/utils'
import { File, fromConfig, listDirs, toConfig, type Files } from '@/models/common/file'
import { getValidName } from '@/models/common/name'

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
const videoNameMaxLength = 100

export type VideoExportLoadOptions = {
  includeId?: boolean
}

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

  constructor(name: string, file: File, inits?: VideoInits) {
    this.id = inits?.id ?? nanoid()
    this.name = name
    this.file = file
    return reactive(this) as this
  }

  static async load(name: string, files: Files, { includeId = true }: VideoExportLoadOptions = {}) {
    const pathPrefix = join(videoAssetPath, name)
    const configFile = files[join(pathPrefix, videoConfigFileName)]
    if (configFile == null) return null
    const { builder_id: id, path } = (await toConfig(configFile)) as RawVideoConfig
    if (path == null) throw new Error(`path expected for video ${name}`)
    const file = files[resolve(pathPrefix, path)]
    if (file == null) throw new Error(`file ${path} for video ${name} not found`)
    return new Video(name, file, { id: includeId ? id : undefined })
  }

  static async loadAll(files: Files, options?: VideoExportLoadOptions) {
    const names = listDirs(files, videoAssetPath)
    const videos = (await Promise.all(names.map((name) => Video.load(name, files, options)))).filter(
      (video) => video != null
    )
    return videos as Video[]
  }

  export({ includeId = true }: VideoExportLoadOptions = {}): Files {
    const filename = this.name + extname(this.file.name)
    const config: RawVideoConfig = { path: filename }
    if (includeId) config.builder_id = this.id
    const assetPath = join(videoAssetPath, this.name)
    return {
      [join(assetPath, videoConfigFileName)]: fromConfig(videoConfigFileName, config),
      [join(assetPath, filename)]: this.file
    }
  }
}

export function validateVideoName(name: string, project: TutorialProject | null): LocaleMessage | null {
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (getStringLengthInCodePoints(name) > videoNameMaxLength) {
    return {
      en: `The name is too long (maximum is ${videoNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${videoNameMaxLength} 个字符）`
    }
  }
  if (name.includes('/')) return { en: 'The name must not contain /', zh: '名字不可包含 /' }
  if (project?.videos.some((video) => video.name === name)) {
    return { en: `Video with name ${name} already exists`, zh: '存在同名的视频' }
  }
  return null
}

export function ensureValidVideoName(name: string, project: TutorialProject | null) {
  if (validateVideoName(name, project) == null) return name
  return getVideoName(project, name)
}

export function getVideoName(project: TutorialProject | null, base: string) {
  if (validateVideoName(base, null) != null) throw new Error(`invalid video name ${base}`)
  return getValidName(base, (name) => validateVideoName(name, project) == null)
}
