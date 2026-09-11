import { nanoid } from 'nanoid'
import { reactive } from 'vue'

import { extname, join, resolve } from '@/utils/path'
import type { LocaleMessage } from '@/utils/i18n'
import { getStringLengthInCodePoints } from '@/utils/utils'
import { File, fromText, listDirs, toConfig, type Files } from '@/models/common/file'
import { getValidName } from '@/models/common/name'

import { DerivedFile } from './derived-file'
import type { TutorialProject } from './project'

/**
 * Optional inputs for the `Resource` constructor beyond the identifying triple (kind, name, payload file).
 * Consumed by: models/tutorial/resource.ts#Resource.constructor (the only caller passing it is `Resource.load`).
 */
export type ResourceInits = {
  /** Stable identifier persisted as `builder_id` in the manifest; a fresh nanoid is generated when omitted. */
  id?: string
  /** Records in the resource's directory other than its manifest and payload, keyed by path relative to it. */
  extraFiles?: Files
}

/**
 * Shape of the resource manifest `assets/<kind>/<name>/index.json` as stored on disk. Both fields are optional
 * on read because a manifest may lack `builder_id`; a missing `path` is treated as a load error.
 * Consumed by: models/tutorial/resource.ts#Resource.load (parse), models/tutorial/resource.ts#Resource.export
 * (serialize).
 */
export type RawResourceConfig = {
  /** Identifier the Builder assigned to the package; survives renames so UI state can follow the resource. */
  builder_id?: string
  /** Path of the payload file, relative to the package directory (for example `step-to.mp4`). */
  path?: string
}

/**
 * Directory of course-local resources addressed by the course program.
 * Consumed by: models/tutorial/resource.ts#getResourceKindDir, models/tutorial/resource.ts#Resource.loadAll,
 * components/course-editor/upload.ts#getUploadResourceKind and #validateUploadDir (path checks and messages).
 */
export const assetsDir = 'assets'
/**
 * The resource kind the course program can address today (`showVideo`).
 * Consumed by: components/course-editor/course-tree.ts#buildCourseTree (always shows the videos folder),
 * components/course-editor/CourseResourceDoc.vue#preview and #template (video preview),
 * components/course-editor/CourseExplorerNode.vue#hint (labels),
 * components/course-editor/CourseFolderDoc.vue#isVideosFolder,
 * components/course-editor/upload.ts#validateUploadDir (example path in messages).
 */
export const videosKind = 'videos'
/** File name of the manifest inside every resource package directory. */
const resourceConfigFileName = 'index.json'
/** Upper bound of a resource name, counted in Unicode code points. */
const resourceNameMaxLength = 100

/**
 * Directory holding the resources of `kind`, without trailing slash.
 * @param kind - Resource kind, i.e. the directory name under `assets/`.
 * @returns `assets/<kind>`.
 * Called by: models/tutorial/resource.ts#getResourceAssetPath, models/tutorial/resource.ts#Resource.loadAll,
 * components/course-editor/course-tree.ts#buildCourseTree,
 * components/course-editor/CourseResourceDoc.vue#handleDelete, components/course-editor/CourseExplorerNode.vue#hint,
 * components/course-editor/CourseFolderDoc.vue#isVideosFolder.
 */
export function getResourceKindDir(kind: string) {
  return join(assetsDir, kind)
}

/**
 * Directory of the resource package `kind`/`name`, without trailing slash.
 * @param kind - Resource kind.
 * @param name - Resource name (a single path segment).
 * @returns `assets/<kind>/<name>`.
 * Called by: models/tutorial/resource.ts#Resource.assetPath, models/tutorial/resource.ts#Resource.load.
 */
export function getResourceAssetPath(kind: string, name: string) {
  return join(getResourceKindDir(kind), name)
}

/**
 * Options shared by `Resource.load`, `Resource.loadAll` and `Resource.export`.
 * Consumed by: models/tutorial/resource.ts#Resource.load, #Resource.loadAll and #Resource.export.
 */
export type ResourceExportLoadOptions = {
  /**
   * Whether `builder_id` takes part in the round trip: on load, whether the stored id is kept (otherwise a fresh
   * one is generated); on export, whether the id is written to the manifest. Defaults to `true`.
   */
  includeId?: boolean
}

/**
 * A resource package: the directory `assets/<kind>/<name>/` with a manifest pointing at the payload file. The kind
 * is the directory under `assets/`; which kinds the course program can address is up to the course format (videos
 * today), the package shape is the same for all of them. The package owns every record in its directory, so records
 * the format does not know yet are carried along and written back.
 *
 * Invariants:
 * - `kind` passes `validateResourceKind` (checked once in the constructor; the field is readonly).
 * - `name` passes `validateResourceName` against `_project` at the time it was set via `setName`. The constructor
 *   does not validate the name, so that `TutorialProject.prepareAddResource` can resolve conflicts first.
 * - `_project` is the owning `TutorialProject` while the resource is in `project.resources`, null otherwise; only
 *   `TutorialProject` toggles it (`addResource`, `removeResource`, `loadFiles`).
 * - `export()` writes exactly: every `extraFiles` record, the manifest and the payload, all under `assetPath`. The
 *   manifest `File` keeps its identity while its JSON is unchanged (memoized through `configFile`).
 * - The instance is reactive (`reactive(this)`).
 *
 * Consumed by: models/tutorial/project.ts#TutorialProject (owns the `resources` list),
 * components/course-editor/upload.ts#addUploadedFiles (creates packages from uploads),
 * components/course-editor/CourseResourceDoc.vue (rename, replace payload text, delete),
 * components/course-editor/course-tree.ts#buildCourseTree (one tree node per package),
 * models/tutorial/resource.test.ts and models/tutorial/project.test.ts.
 */
export class Resource {
  /** Stable identifier; the Course Editor addresses resources by it when removing them. */
  id: string
  /** Directory name under `assets/`; fixed for the lifetime of the package. */
  readonly kind: string

  /** The owning Tutorial project, used for name-uniqueness checks; null while not attached to a project. */
  _project: TutorialProject | null = null
  /**
   * Attaches the resource to, or detaches it from, its owning project.
   * @param project - The owning `TutorialProject`, or null to detach.
   * @returns void; only `_project` changes.
   * Called by: models/tutorial/project.ts#TutorialProject.prepareAddResource (attach),
   * models/tutorial/project.ts#TutorialProject.removeResource (detach),
   * models/tutorial/project.ts#TutorialProject.loadFiles (detaches the previously loaded resources).
   */
  setProject(project: TutorialProject | null) {
    this._project = project
  }

  /** Package name, i.e. the directory name under `assets/<kind>/`. */
  name: string
  /**
   * Renames the package after validating the new name against the owning project (uniqueness within `kind`).
   * @param name - The new name.
   * @throws Error carrying the English validation message when `name` is invalid or already taken in `_project`.
   * @returns void; changes `name`, hence `assetPath` and every path written by `export()`.
   * Called by: models/tutorial/project.ts#TutorialProject.prepareAddResource,
   * components/course-editor/CourseResourceDoc.vue#handleRename, models/tutorial/resource.test.ts.
   */
  setName(name: string) {
    // Validate against the project so two packages of the same kind never share a directory.
    const error = validateResourceName(this.kind, name, this._project)
    if (error != null) throw new Error(`invalid ${this.kind} resource name ${name}: ${error.en}`)
    this.name = name
  }

  /** The payload file (video, image, text, ...). Its extension is kept; its base name is replaced on export. */
  file: File
  /**
   * Replaces the payload file.
   * @param file - The new payload `File`.
   * @returns void; only `file` changes.
   * Called by: components/course-editor/CourseResourceDoc.vue#handleTextChange.
   */
  setFile(file: File) {
    this.file = file
  }

  /** Records in the package directory other than the manifest and the payload, keyed by relative path. */
  extraFiles: Files

  /** Memo generating the manifest record from its JSON; see `DerivedFile` for why identity matters. */
  private configFile = new DerivedFile((json) => fromText(resourceConfigFileName, json))

  /**
   * Creates a resource package in memory. The name is not validated here (see the class invariants).
   * @param kind - Resource kind; must pass `validateResourceKind`.
   * @param name - Resource name.
   * @param file - Payload file.
   * @param inits - Optional `id` and `extraFiles` (see `ResourceInits`).
   * @throws Error when `kind` is blank or contains `/`.
   * @returns A reactive `Resource`.
   * Called by: models/tutorial/resource.ts#Resource.load, components/course-editor/upload.ts#addUploadedFiles,
   * models/tutorial/resource.test.ts, models/tutorial/project.test.ts.
   */
  constructor(kind: string, name: string, file: File, inits?: ResourceInits) {
    // The kind becomes a directory name, so reject values that cannot be one.
    const kindError = validateResourceKind(kind)
    if (kindError != null) throw new Error(`invalid resource kind ${kind}: ${kindError.en}`)
    // Take over the identity from the manifest when loading, otherwise mint a new one.
    this.id = inits?.id ?? nanoid()
    this.kind = kind
    this.name = name
    this.file = file
    // Copy so that later mutations of the caller's map do not leak into the package.
    this.extraFiles = { ...inits?.extraFiles }
    return reactive(this) as this
  }

  /**
   * Directory of this package (`assets/<kind>/<name>`), without trailing slash.
   * @returns The package directory path.
   * Called by: models/tutorial/resource.ts#Resource.export, models/tutorial/project.ts#isClaimedPath,
   * components/course-editor/upload.ts#addUploadedFiles, components/course-editor/course-tree.ts#buildCourseTree,
   * components/course-editor/CourseResourceDoc.vue#handleRename.
   */
  get assetPath() {
    return getResourceAssetPath(this.kind, this.name)
  }

  /**
   * Loads one package from a set of Tutorial-project records.
   * @param kind - Resource kind (directory under `assets/`).
   * @param name - Resource name (directory under `assets/<kind>/`).
   * @param files - All records of the Tutorial project, keyed by path relative to its root.
   * @param options.includeId - Keep the manifest's `builder_id` (default) or generate a fresh id instead.
   * @throws Error when the manifest has no `path`, or the payload it points at is missing.
   * @returns The loaded `Resource`, or null when the directory has no manifest (then it is not a package).
   * Called by: models/tutorial/resource.ts#Resource.loadAll, models/tutorial/resource.test.ts.
   */
  static async load(kind: string, name: string, files: Files, { includeId = true }: ResourceExportLoadOptions = {}) {
    // A directory is a package only if it carries a manifest; otherwise its records stay unclaimed.
    const pathPrefix = getResourceAssetPath(kind, name)
    const configFilePath = join(pathPrefix, resourceConfigFileName)
    const configFile = files[configFilePath]
    if (configFile == null) return null
    // Read the manifest and locate the payload it points at (the path is relative to the package directory).
    const { builder_id: id, path } = (await toConfig(configFile)) as RawResourceConfig
    if (path == null) throw new Error(`path expected for ${kind} resource ${name}`)
    const filePath = resolve(pathPrefix, path)
    const file = files[filePath]
    if (file == null) throw new Error(`file ${path} for ${kind} resource ${name} not found`)
    // Everything else under the package directory is carried along verbatim, keyed relative to the package.
    const extraFiles: Files = {}
    const dirPrefix = pathPrefix + '/'
    for (const [recordPath, record] of Object.entries(files)) {
      if (record == null || !recordPath.startsWith(dirPrefix)) continue
      if (recordPath === configFilePath || recordPath === filePath) continue
      extraFiles[recordPath.slice(dirPrefix.length)] = record
    }
    return new Resource(kind, name, file, { id: includeId ? id : undefined, extraFiles })
  }

  /**
   * Every package under `assets/`: directories with a manifest, whatever their kind.
   * @param files - All records of the Tutorial project, keyed by path relative to its root.
   * @param options - Passed through to `Resource.load` (see `ResourceExportLoadOptions`).
   * @returns The loaded packages, grouped by kind in directory-listing order; directories without a manifest
   *   are skipped.
   * Called by: models/tutorial/project.ts#TutorialProject.loadFiles, models/tutorial/resource.test.ts.
   */
  static async loadAll(files: Files, options?: ResourceExportLoadOptions) {
    const resources: Resource[] = []
    // Kinds are the first-level directories under `assets/`; packages are the directories under each kind.
    for (const kind of listDirs(files, assetsDir)) {
      const names = listDirs(files, getResourceKindDir(kind))
      // Packages of one kind load concurrently; a null result is a directory without a manifest.
      const loaded = await Promise.all(names.map((name) => Resource.load(kind, name, files, options)))
      for (const resource of loaded) if (resource != null) resources.push(resource)
    }
    return resources
  }

  /**
   * Produces the package records: extra files, manifest and payload, all under `assetPath`. The payload is
   * written as `<name><ext>` so its file name follows the resource name.
   * @param options.includeId - Whether to write `builder_id` into the manifest (default `true`).
   * @returns A `Files` map keyed by path relative to the Tutorial-project root.
   * Called by: models/tutorial/project.ts#TutorialProject.exportFiles, models/tutorial/resource.test.ts.
   */
  export({ includeId = true }: ResourceExportLoadOptions = {}): Files {
    // The payload is renamed after the resource, keeping only the original extension.
    const filename = this.name + extname(this.file.name)
    const config: RawResourceConfig = { path: filename }
    if (includeId) config.builder_id = this.id
    const assetPath = this.assetPath
    const files: Files = {}
    // Extra records first, so that the manifest and payload written below win on a (theoretical) path clash.
    for (const [relativePath, record] of Object.entries(this.extraFiles)) {
      if (record != null) files[join(assetPath, relativePath)] = record
    }
    // The manifest is memoized by its JSON; the payload is the `File` instance itself.
    files[join(assetPath, resourceConfigFileName)] = this.configFile.get(JSON.stringify(config))
    files[join(assetPath, filename)] = this.file
    return files
  }
}

/**
 * Checks that `kind` can be a directory name under `assets/`.
 * @param kind - Resource kind to validate.
 * @returns A bilingual message describing the problem, or null when `kind` is valid.
 * Called by: models/tutorial/resource.ts#Resource.constructor, components/course-editor/upload.ts#addUploadedFiles.
 */
export function validateResourceKind(kind: string): LocaleMessage | null {
  if (kind === '') return { en: 'The resource kind must not be blank', zh: '资源类型不可为空' }
  if (kind.includes('/')) return { en: 'The resource kind must not contain /', zh: '资源类型不可包含 /' }
  return null
}

/**
 * Checks that `name` can be the directory name of a package of `kind`, and is unused in `project` when given.
 * @param kind - Resource kind the name is checked within (uniqueness is per kind).
 * @param name - Candidate resource name.
 * @param project - Project to check uniqueness against, or null to skip the uniqueness check.
 * @returns A bilingual message describing the first problem found, or null when `name` is valid.
 * Called by: models/tutorial/resource.ts#Resource.setName, models/tutorial/resource.ts#ensureValidResourceName,
 * models/tutorial/resource.ts#getResourceName, components/course-editor/CourseResourceDoc.vue#handleRename,
 * components/course-editor/upload.ts#deriveResourceName, models/tutorial/resource.test.ts.
 */
export function validateResourceName(
  kind: string,
  name: string,
  project: TutorialProject | null
): LocaleMessage | null {
  // Shape checks: non-blank, bounded length (in code points, so CJK and emoji count as one), single segment.
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (getStringLengthInCodePoints(name) > resourceNameMaxLength) {
    return {
      en: `The name is too long (maximum is ${resourceNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${resourceNameMaxLength} 个字符）`
    }
  }
  if (name.includes('/')) return { en: 'The name must not contain /', zh: '名字不可包含 /' }
  // Uniqueness within the kind, when a project is given to check against.
  if (project?.getResource(kind, name) != null) {
    return { en: `${kind} resource with name ${name} already exists`, zh: '存在同名的资源' }
  }
  return null
}

/**
 * Returns `name` when it is valid in `project`, otherwise a derived name that is (numeric suffix appended).
 * @param kind - Resource kind.
 * @param name - Preferred name.
 * @param project - Project to check uniqueness against, or null.
 * @throws Error (from `getResourceName`) when `name` is invalid for a reason other than a conflict.
 * @returns A name that passes `validateResourceName` in `project`.
 * Called by: models/tutorial/project.ts#TutorialProject.prepareAddResource.
 */
export function ensureValidResourceName(kind: string, name: string, project: TutorialProject | null) {
  if (validateResourceName(kind, name, project) == null) return name
  return getResourceName(project, kind, name)
}

/**
 * Derives a name that is free in `project` from `base`, by appending or bumping a numeric suffix.
 * @param project - Project to check uniqueness against, or null (then `base` itself is free).
 * @param kind - Resource kind.
 * @param base - Starting name; must be valid apart from uniqueness.
 * @throws Error when `base` is blank, too long or contains `/`.
 * @returns The first candidate (`base`, then `base` with an increasing numeric suffix) that passes
 *   `validateResourceName`.
 * Called by: models/tutorial/resource.ts#ensureValidResourceName,
 * components/course-editor/upload.ts#deriveResourceName.
 */
export function getResourceName(project: TutorialProject | null, kind: string, base: string) {
  // Only conflicts can be fixed by renaming; a malformed base is a programming error.
  if (validateResourceName(kind, base, null) != null) throw new Error(`invalid resource name ${base}`)
  return getValidName(base, (name) => validateResourceName(kind, name, project) == null)
}
