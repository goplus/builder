/**
 * Upload policy of the course explorer. The author says what they are uploading, never where it goes: an
 * `UploadType` maps to the directory its files land in (`getUploadDir`), and the rules below decide whether that
 * is allowed. The types are the layer the upload modal works in; everything under them is the course format.
 *
 * Where a file may land follows the ownership of the tree:
 * - `assets/` holds resources addressed by the course program, so it only contains packages: uploading into
 *   `assets/<kind>` creates a package of that kind with its generated manifest, whatever the file's extension (the
 *   kind is just the directory name; which kinds the course program can address is up to the course format).
 *   `assets/` itself has no kind to package with and package directories are managed by the editor, so both refuse.
 * - the embedded project's directory belongs to the Project Editor, and fixed-path records have their own editors.
 * - anywhere else the file becomes a plain record, kept but unused by the course.
 * New folders are not a feature of their own: a directory exists as soon as a record's path names it.
 *
 * The validation functions return `LocaleMessage | null` (a reason to refuse, or nothing) so the same rule can be
 * shown in the upload modal, gate the "Upload" button of a folder document, and pick a default target folder.
 * `addUploadedFiles` is the only function here that mutates the project.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { stripExt } from '@/utils/path'
import { fromNativeFile, type File } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import {
  assetsDir,
  getResourceKindDir,
  getResourceName,
  imagesKind,
  Resource,
  validateResourceKind,
  validateResourceName,
  videosKind
} from '@/models/tutorial/resource'
import { isPathWithin, pathToSegments } from './route'

/**
 * What the author says they are uploading. The type is the whole choice: it decides the directory the files land
 * in and whether they become resource packages, so no path is ever typed.
 * - `'video'` / `'picture'`: one package per file under that kind's directory, with a generated manifest.
 * - `'other'`: the files are kept with the course as they are, and the course does not use them.
 * Consumed by: components/course-editor/CourseUploadModal.vue, components/course-editor/CourseEditor.vue,
 * components/course-editor/CourseFolderDoc.vue.
 */
export type UploadType = 'video' | 'picture' | 'other'

/** The upload types offered, in the order the modal lists them. */
export const uploadTypes: UploadType[] = ['video', 'picture', 'other']

/**
 * The resource kind an upload type packages its files as.
 * @param type - The chosen type.
 * @returns The kind (`videos`, `images`), or null when the files stay plain records.
 * Called by: components/course-editor/upload.ts#getUploadDir.
 */
export function getUploadTypeKind(type: UploadType): string | null {
  switch (type) {
    case 'video':
      return videosKind
    case 'picture':
      return imagesKind
    case 'other':
      return null
  }
}

/**
 * Where the files of an upload type go.
 * @param type - The chosen type.
 * @returns `assets/<kind>` for a resource type, `''` (the course root) for `'other'`.
 * Called by: components/course-editor/upload.ts#validateUpload and #addUploadedFilesOfType,
 * components/course-editor/CourseUploadModal.vue#conflicts, components/course-editor/CourseEditor.vue#handleUpload.
 */
export function getUploadDir(type: UploadType) {
  const kind = getUploadTypeKind(type)
  return kind == null ? '' : getResourceKindDir(kind)
}

/**
 * The name of an upload type, as the author reads it.
 * @param type - The chosen type.
 * @returns A localized label.
 * Called by: components/course-editor/CourseUploadModal.vue#template.
 */
export function getUploadTypeLabel(type: UploadType): LocaleMessage {
  switch (type) {
    case 'video':
      return { en: 'Video', zh: '视频' }
    case 'picture':
      return { en: 'Picture', zh: '图片' }
    case 'other':
      return { en: 'Something else', zh: '其他文件' }
  }
}

/**
 * One line saying what uploading this type will do, shown under the choice.
 * @param type - The chosen type.
 * @returns A localized explanation.
 * Called by: components/course-editor/CourseUploadModal.vue#template.
 */
export function getUploadTypeHint(type: UploadType): LocaleMessage {
  switch (type) {
    case 'video':
      return {
        en: 'The course program can play it by name, for example showVideo "step-to".',
        zh: '课程程序可以按名字播放它，例如 showVideo "step-to"。'
      }
    case 'picture':
      return {
        en: 'Kept with the course. No course-program call uses pictures yet.',
        zh: '随课程一起保存。目前还没有课程程序调用会用到图片。'
      }
    case 'other':
      return {
        en: 'Kept with the course exactly as it is. The course does not use it.',
        zh: '原样随课程保存，课程不会使用它。'
      }
  }
}

/**
 * The type to start the upload modal on, given what the author currently has open. Uploading from inside a
 * resource group means adding to that group; anywhere else the common case is a video.
 * @param path - The open node's in-Course-Editor path; `''` for the course itself.
 * @returns The upload type to preselect.
 * Called by: components/course-editor/CourseEditor.vue#handleUpload.
 */
export function getUploadTypeAt(path: string): UploadType {
  if (isPathWithin(path, getResourceKindDir(imagesKind))) return 'picture'
  return 'video'
}

/**
 * Why the chosen files cannot be uploaded as `type`, or null when they can. The directory rule is checked once,
 * then each file's own path; resource types pass the per-file rules by construction (their records are named
 * after a derived package name, not after the file).
 * @param project - The loaded Tutorial project.
 * @param type - The chosen upload type.
 * @param names - The chosen files' names.
 * @returns A localized reason to refuse, or null.
 * Called by: components/course-editor/CourseUploadModal.vue#error, components/course-editor/upload.test.ts.
 */
export function validateUpload(project: TutorialProject, type: UploadType, names: string[]): LocaleMessage | null {
  const dir = getUploadDir(type)
  const dirError = validateUploadDir(project, dir)
  if (dirError != null) return dirError
  for (const name of names) {
    const pathError = validateUploadPath(project, dir, name)
    if (pathError != null) return pathError
  }
  return null
}

/**
 * Put the uploaded files into the course as `type`. A thin wrapper over `addUploadedFiles`, which works in
 * directories; the UI only ever knows types.
 * @param project - The loaded Tutorial project; mutated.
 * @param type - The chosen upload type, already validated.
 * @param files - The native files chosen by the author.
 * @returns One path per file, in order (the package path, or the record path).
 * Called by: components/course-editor/CourseEditor.vue#handleUpload, components/course-editor/upload.test.ts.
 */
export function addUploadedFilesOfType(project: TutorialProject, type: UploadType, files: globalThis.File[]) {
  return addUploadedFiles(project, getUploadDir(type), files)
}

/**
 * Join a normalized directory and a file name into a record path, without producing a leading slash for the root.
 *
 * @param dir - A normalized directory; `''` for the root.
 * @param name - A file name (no slashes).
 * @returns `name` itself under the root, otherwise `dir/name`.
 *
 * Called by:
 * - components/course-editor/upload.ts#validateUploadPath
 * - components/course-editor/upload.ts#getUploadConflicts
 * - components/course-editor/upload.ts#addUploadedFiles
 */
export function joinPath(dir: string, name: string) {
  return dir === '' ? name : `${dir}/${name}`
}

/**
 * The resource kind files uploaded into `dir` are packaged as, or null when `dir` is not `assets/<kind>`. Exactly
 * two segments are required: `assets` alone has no kind, and `assets/<kind>/<name>` is a package directory.
 *
 * @param dir - A normalized directory.
 * @returns The kind (second segment), or `null`.
 *
 * Called by:
 * - components/course-editor/upload.ts#validateUploadDir
 * - components/course-editor/upload.ts#validateUploadPath
 * - components/course-editor/upload.ts#getUploadConflicts
 * - components/course-editor/upload.ts#addUploadedFiles
 * - components/course-editor/upload.ts#getUploadTypeKind (through the kinds the types map to)
 */
export function getUploadResourceKind(dir: string): string | null {
  const segments = pathToSegments(dir)
  if (segments.length !== 2 || segments[0] !== assetsDir) return null
  return segments[1]
}

/**
 * Why files cannot be uploaded into `dir`, or null when they can. Checks only the directory; per-file rules are in
 * `validateUploadPath`. The three refusals, in order: the embedded project's directory, `assets` itself, and any
 * deeper path under `assets` that is not exactly `assets/<kind>` (package directories, or paths inside them).
 *
 * @param project - The loaded Tutorial project (its `config.project.root` is read).
 * @param dir - A normalized directory; `''` for the root.
 * @returns A localized reason to refuse, or `null` when the directory accepts uploads.
 * @throws Error when the project has not been loaded (`config == null`).
 *
 * Called by:
 * - components/course-editor/upload.ts#validateUploadPath
 * - components/course-editor/upload.ts#validateUpload (the rule every upload type goes through)
 * - components/course-editor/upload.test.ts
 */
export function validateUploadDir(project: TutorialProject, dir: string): LocaleMessage | null {
  const config = project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  // The project root and everything under it is the Project Editor's; its asset import lives there.
  if (isPathWithin(dir, config.project.root)) {
    return {
      en: 'Files of the embedded project are managed in the Project Editor; import assets there',
      zh: '工程内的文件由工程编辑器管理，请在那里导入素材'
    }
  }
  // `assets` alone gives no kind to package the files as; point the author one level down.
  if (dir === assetsDir) {
    return {
      en: `Choose a resource type folder under ${assetsDir}, e.g. ${assetsDir}/${videosKind} or ${assetsDir}/images`,
      zh: `请选择或输入 ${assetsDir} 下的资源类型目录，例如 ${assetsDir}/${videosKind} 或 ${assetsDir}/images`
    }
  }
  // Deeper than `assets/<kind>` means inside a package (existing or not); packages are generated, not uploaded to.
  if (isPathWithin(dir, assetsDir) && getUploadResourceKind(dir) == null) {
    return {
      en: `Packages under ${assetsDir} are managed by the editor; upload into ${assetsDir}/<kind> to add one`,
      zh: `${assetsDir} 下的包由编辑器管理，上传到 ${assetsDir}/<类型> 即可新增一个`
    }
  }
  // A folder cannot be where a file is: nothing could be opened at that path any more.
  const fileInTheWay = dir === '' ? null : project.getRecordPathConflict(dir, true)
  if (fileInTheWay != null) {
    return { en: `${fileInTheWay} is a file, not a folder`, zh: `${fileInTheWay} 是文件，不是目录` }
  }
  return null
}

/**
 * Why `name` cannot be uploaded into `dir` as a plain record, or null when it can. Includes the directory rule,
 * so callers need not run `validateUploadDir` first. Files bound for `assets/<kind>` always pass: they become
 * packages named after the file, so their own name never collides with a fixed-path or claimed record.
 *
 * @param project - The loaded Tutorial project (`config` and `isClaimedPath` are used).
 * @param dir - A normalized directory.
 * @param name - The uploaded file's name.
 * @returns A localized reason to refuse, or `null` when the record may be written.
 * @throws Error when the project has not been loaded (via `validateUploadDir` / `isClaimedPath`).
 *
 * Called by:
 * - components/course-editor/upload.ts#validateUpload
 * - components/course-editor/upload.test.ts
 */
export function validateUploadPath(project: TutorialProject, dir: string, name: string): LocaleMessage | null {
  // The directory rule comes first; a refused directory refuses every file.
  const dirError = validateUploadDir(project, dir)
  if (dirError != null) return dirError
  // Package uploads never write `dir/name` directly, so there is nothing more to check.
  if (getUploadResourceKind(dir) != null) return null
  // Fixed-path records (`index.json`, `main_course.gox`) are generated from the model and have dedicated editors.
  const path = joinPath(dir, name)
  if (path === configFilePath || path === mainCourseFilePath) {
    return { en: `${path} is edited in its own editor`, zh: `${path} 请在对应的编辑器中修改` }
  }
  // Anything a typed part of the model claims (inside a package, say) cannot hold an extra file.
  if (project.isClaimedPath(path)) {
    return { en: `${path} is managed by the course`, zh: `${path} 由课程管理，不能上传到这里` }
  }
  // Loading a course keys its files by path in a plain object, where this key would not survive.
  if (path === '__proto__') {
    return { en: `${path} cannot be used as a file name`, zh: `${path} 不能用作文件名` }
  }
  // A file cannot be where a folder is, including the folders the course keeps while they are still empty.
  if (project.isReservedDirectory(path)) {
    return { en: `${path} is a folder the course keeps for its resources`, zh: `${path} 是课程为资源保留的目录` }
  }
  const conflict = project.getRecordPathConflict(path)
  if (conflict != null) {
    return {
      en: `${path} is a folder in the course (it holds ${conflict})`,
      zh: `${path} 是课程里的目录（其中有 ${conflict}）`
    }
  }
  return null
}

/**
 * Paths of existing plain records that uploading `names` into `dir` would replace. Shown as a warning, not an
 * error: replacing is allowed. Package uploads never conflict because a fresh package name is derived per file.
 *
 * @param project - The loaded Tutorial project (`extraFiles` is consulted through `getExtraFile`).
 * @param dir - A normalized directory that passed validation.
 * @param names - The uploaded files' names.
 * @returns The subset of `dir/name` paths that already hold an extra file; `[]` for `assets/<kind>`.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#conflicts
 * - components/course-editor/upload.test.ts
 */
export function getUploadConflicts(project: TutorialProject, dir: string, names: string[]) {
  if (getUploadResourceKind(dir) != null) return []
  return names.map((name) => joinPath(dir, name)).filter((path) => project.getExtraFile(path) != null)
}

/**
 * Pick a unique resource name for a file uploaded into `assets/<kind>`. Starts from the file name without its
 * extension; when that is not a valid resource name on its own (blank, too long, contains `/`), starts from the
 * kind instead. Either way the name is made unique among the project's resources of that kind.
 *
 * @param project - The loaded Tutorial project (existing resources are consulted for uniqueness).
 * @param kind - The resource kind (`assets/<kind>`).
 * @param file - The payload file; its name without extension seeds the resource name, its extension the payload path.
 * @returns A name that `validateResourceName` accepts for `project`, e.g. `step-to` or `step-to2`.
 *
 * Called by:
 * - components/course-editor/upload.ts#addUploadedFiles
 */
export function deriveResourceName(project: TutorialProject, kind: string, file: File) {
  const base = stripExt(file.name)
  // Derive the resource name from the file name when it is well formed, otherwise start from the kind.
  // `validateResourceName` gets `null` as the project here so a name that merely clashes still counts as usable;
  // `getResourceName` then appends a suffix until the whole layout (uniqueness, payload path) is valid.
  return getResourceName(project, kind, validateResourceName(kind, base, null) == null ? base : kind, {
    file,
    extraFiles: new Map()
  })
}

/**
 * Put uploaded files into the course under `dir`, which must have passed validation. Returns the path of the node
 * created for each file: the package for `assets/<kind>`, the record otherwise.
 *
 * @param project - The loaded Tutorial project; mutated through `addResource` or `setExtraFile`.
 * @param dir - A normalized directory that passed `validateUploadDir` (and `validateUploadPath` per file).
 * @param files - The native files chosen by the author.
 * @returns One path per file, in order: `assets/<kind>/<name>` for packages, `dir/<file name>` for records.
 *   `CourseEditor.vue` opens the first one.
 * @throws Error when `dir` names a kind `validateResourceKind` refuses (cannot happen for a normalized
 *   `assets/<kind>`; kept as a guard), or from `setExtraFile` when a path is claimed (validation prevents it).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#handleUpload
 * - components/course-editor/upload.test.ts
 */
export function addUploadedFiles(project: TutorialProject, dir: string, files: globalThis.File[]): string[] {
  const kind = getUploadResourceKind(dir)
  if (kind != null) {
    if (validateResourceKind(kind) != null) throw new Error(`invalid resource kind ${kind}`)
    const added: Resource[] = []
    try {
      return files.map((nativeFile) => {
        const file = fromNativeFile(nativeFile)
        const resource = new Resource(kind, deriveResourceName(project, kind, file), file)
        project.addResource(resource)
        added.push(resource)
        return resource.assetPath
      })
    } catch (error) {
      // All or nothing: a failure part-way leaves the course as it was before this upload.
      for (const resource of added) project.removeResource(resource.id)
      throw error
    }
  }
  // What each path held before, to undo the upload should one of the files fail.
  const previous: Array<[path: string, file: File | null]> = []
  try {
    return files.map((nativeFile) => {
      const path = joinPath(dir, nativeFile.name)
      previous.push([path, project.getExtraFile(path)])
      project.setExtraFile(path, fromNativeFile(nativeFile))
      return path
    })
  } catch (error) {
    // Undo in reverse, so two files uploaded to one path end up as that path was before either of them.
    for (const [path, file] of previous.reverse()) {
      if (file != null) project.setExtraFile(path, file)
      else if (project.getExtraFile(path) != null) project.removeExtraFile(path)
    }
    throw error
  }
}
