import { nanoid } from 'nanoid'
import { reactive } from 'vue'

import { extname, join, resolve } from '@/utils/path'
import type { LocaleMessage } from '@/utils/i18n'
import { getStringLengthInCodePoints } from '@/utils/utils'
import { File, fromText, listDirs, toConfig, type Files } from '@/models/common/file'
import { getValidName } from '@/models/common/name'

import { DerivedFile } from './derived-file'
import type { TutorialProject } from './project'

export type ResourceInits = {
  id?: string
  /** Records in the resource's directory other than its manifest and payload, keyed by path relative to it. */
  extraFiles?: Files
}

export type RawResourceConfig = {
  builder_id?: string
  path?: string
}

/** Directory of course-local resources addressed by the course program. */
export const assetsDir = 'assets'
/** The resource kind the course program can address today (`showVideo`). */
export const videosKind = 'videos'
const resourceConfigFileName = 'index.json'
const resourceNameMaxLength = 100

/** Directory holding the resources of `kind`, without trailing slash. */
export function getResourceKindDir(kind: string) {
  return join(assetsDir, kind)
}

/** Directory of the resource package `kind`/`name`, without trailing slash. */
export function getResourceAssetPath(kind: string, name: string) {
  return join(getResourceKindDir(kind), name)
}

export type ResourceExportLoadOptions = {
  includeId?: boolean
}

/**
 * A resource package: the directory `assets/<kind>/<name>/` with a manifest pointing at the payload file. The kind
 * is the directory under `assets/`; which kinds the course program can address is up to the course format (videos
 * today), the package shape is the same for all of them. The package owns every record in its directory, so records
 * the format does not know yet are carried along and written back.
 */
export class Resource {
  id: string
  readonly kind: string

  _project: TutorialProject | null = null
  setProject(project: TutorialProject | null) {
    this._project = project
  }

  name: string
  setName(name: string) {
    const error = validateResourceName(this.kind, name, this._project)
    if (error != null) throw new Error(`invalid ${this.kind} resource name ${name}: ${error.en}`)
    this.name = name
  }

  file: File
  setFile(file: File) {
    this.file = file
  }

  /** Records in the package directory other than the manifest and the payload, keyed by relative path. */
  extraFiles: Files

  private configFile = new DerivedFile((json) => fromText(resourceConfigFileName, json))

  constructor(kind: string, name: string, file: File, inits?: ResourceInits) {
    const kindError = validateResourceKind(kind)
    if (kindError != null) throw new Error(`invalid resource kind ${kind}: ${kindError.en}`)
    this.id = inits?.id ?? nanoid()
    this.kind = kind
    this.name = name
    this.file = file
    this.extraFiles = { ...inits?.extraFiles }
    return reactive(this) as this
  }

  get assetPath() {
    return getResourceAssetPath(this.kind, this.name)
  }

  static async load(kind: string, name: string, files: Files, { includeId = true }: ResourceExportLoadOptions = {}) {
    const pathPrefix = getResourceAssetPath(kind, name)
    const configFilePath = join(pathPrefix, resourceConfigFileName)
    const configFile = files[configFilePath]
    if (configFile == null) return null
    const { builder_id: id, path } = (await toConfig(configFile)) as RawResourceConfig
    if (path == null) throw new Error(`path expected for ${kind} resource ${name}`)
    const filePath = resolve(pathPrefix, path)
    const file = files[filePath]
    if (file == null) throw new Error(`file ${path} for ${kind} resource ${name} not found`)
    const extraFiles: Files = {}
    const dirPrefix = pathPrefix + '/'
    for (const [recordPath, record] of Object.entries(files)) {
      if (record == null || !recordPath.startsWith(dirPrefix)) continue
      if (recordPath === configFilePath || recordPath === filePath) continue
      extraFiles[recordPath.slice(dirPrefix.length)] = record
    }
    return new Resource(kind, name, file, { id: includeId ? id : undefined, extraFiles })
  }

  /** Every package under `assets/`: directories with a manifest, whatever their kind. */
  static async loadAll(files: Files, options?: ResourceExportLoadOptions) {
    const resources: Resource[] = []
    for (const kind of listDirs(files, assetsDir)) {
      const names = listDirs(files, getResourceKindDir(kind))
      const loaded = await Promise.all(names.map((name) => Resource.load(kind, name, files, options)))
      for (const resource of loaded) if (resource != null) resources.push(resource)
    }
    return resources
  }

  export({ includeId = true }: ResourceExportLoadOptions = {}): Files {
    const filename = this.name + extname(this.file.name)
    const config: RawResourceConfig = { path: filename }
    if (includeId) config.builder_id = this.id
    const assetPath = this.assetPath
    const files: Files = {}
    for (const [relativePath, record] of Object.entries(this.extraFiles)) {
      if (record != null) files[join(assetPath, relativePath)] = record
    }
    files[join(assetPath, resourceConfigFileName)] = this.configFile.get(JSON.stringify(config))
    files[join(assetPath, filename)] = this.file
    return files
  }
}

export function validateResourceKind(kind: string): LocaleMessage | null {
  if (kind === '') return { en: 'The resource kind must not be blank', zh: '资源类型不可为空' }
  if (kind.includes('/')) return { en: 'The resource kind must not contain /', zh: '资源类型不可包含 /' }
  return null
}

export function validateResourceName(
  kind: string,
  name: string,
  project: TutorialProject | null
): LocaleMessage | null {
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (getStringLengthInCodePoints(name) > resourceNameMaxLength) {
    return {
      en: `The name is too long (maximum is ${resourceNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${resourceNameMaxLength} 个字符）`
    }
  }
  if (name.includes('/')) return { en: 'The name must not contain /', zh: '名字不可包含 /' }
  if (project?.getResource(kind, name) != null) {
    return { en: `${kind} resource with name ${name} already exists`, zh: '存在同名的资源' }
  }
  return null
}

export function ensureValidResourceName(kind: string, name: string, project: TutorialProject | null) {
  if (validateResourceName(kind, name, project) == null) return name
  return getResourceName(project, kind, name)
}

export function getResourceName(project: TutorialProject | null, kind: string, base: string) {
  if (validateResourceName(kind, base, null) != null) throw new Error(`invalid resource name ${base}`)
  return getValidName(base, (name) => validateResourceName(kind, name, project) == null)
}
