/**
 * Upload policy of the course explorer. Where a file may land follows the ownership of the tree:
 * - `assets/` holds resources addressed by the course program, so it only contains packages: uploading into
 *   `assets/<kind>` creates a package of that kind with its generated manifest, whatever the file's extension (the
 *   kind is just the directory name; which kinds the course program can address is up to the course format).
 *   `assets/` itself has no kind to package with and package directories are managed by the editor, so both refuse.
 * - the embedded project's directory belongs to the Project Editor, and fixed-path records have their own editors.
 * - anywhere else the file becomes a plain record, kept but unused by the course.
 * New folders are not a feature of their own: a directory exists as soon as a record's path names it.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { stripExt } from '@/utils/path'
import { fromNativeFile } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import {
  assetsDir,
  getResourceName,
  Resource,
  validateResourceKind,
  validateResourceName,
  videosKind
} from '@/models/tutorial/resource'
import { isPathWithin, pathToSegments, segmentsToPath } from './route'

/** Normalize a user-typed directory: no leading/trailing/duplicate slashes; the empty string is the course root. */
export function normalizeDir(dir: string) {
  return segmentsToPath(pathToSegments(dir))
}

export function joinPath(dir: string, name: string) {
  return dir === '' ? name : `${dir}/${name}`
}

/** The resource kind files uploaded into `dir` are packaged as, or null when `dir` is not `assets/<kind>`. */
export function getUploadResourceKind(dir: string): string | null {
  const segments = pathToSegments(dir)
  if (segments.length !== 2 || segments[0] !== assetsDir) return null
  return segments[1]
}

/** Why files cannot be uploaded into `dir`, or null when they can. */
export function validateUploadDir(project: TutorialProject, dir: string): LocaleMessage | null {
  const config = project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  if (isPathWithin(dir, config.project.root)) {
    return {
      en: 'Files of the embedded project are managed in the Project Editor; import assets there',
      zh: '工程内的文件由工程编辑器管理，请在那里导入素材'
    }
  }
  if (dir === assetsDir) {
    return {
      en: `Choose a resource type folder under ${assetsDir}, e.g. ${assetsDir}/${videosKind} or ${assetsDir}/images`,
      zh: `请选择或输入 ${assetsDir} 下的资源类型目录，例如 ${assetsDir}/${videosKind} 或 ${assetsDir}/images`
    }
  }
  if (isPathWithin(dir, assetsDir) && getUploadResourceKind(dir) == null) {
    return {
      en: `Packages under ${assetsDir} are managed by the editor; upload into ${assetsDir}/<kind> to add one`,
      zh: `${assetsDir} 下的包由编辑器管理，上传到 ${assetsDir}/<类型> 即可新增一个`
    }
  }
  return null
}

/** Why `name` cannot be uploaded into `dir` as a plain record, or null when it can. */
export function validateUploadPath(project: TutorialProject, dir: string, name: string): LocaleMessage | null {
  const dirError = validateUploadDir(project, dir)
  if (dirError != null) return dirError
  if (getUploadResourceKind(dir) != null) return null
  const path = joinPath(dir, name)
  if (path === configFilePath || path === mainCourseFilePath) {
    return { en: `${path} is edited in its own editor`, zh: `${path} 请在对应的编辑器中修改` }
  }
  if (project.isClaimedPath(path)) {
    return { en: `${path} is managed by the course`, zh: `${path} 由课程管理，不能上传到这里` }
  }
  return null
}

/** Paths of existing plain records that uploading `names` into `dir` would replace. */
export function getUploadConflicts(project: TutorialProject, dir: string, names: string[]) {
  if (getUploadResourceKind(dir) != null) return []
  return names.map((name) => joinPath(dir, name)).filter((path) => project.getExtraFile(path) != null)
}

export function deriveResourceName(project: TutorialProject, kind: string, fileName: string) {
  const base = stripExt(fileName)
  // Derive the resource name from the file name when it is usable, otherwise start from the kind.
  return getResourceName(project, kind, validateResourceName(kind, base, null) == null ? base : kind)
}

/**
 * Put uploaded files into the course under `dir`, which must have passed validation. Returns the path of the node
 * created for each file: the package for `assets/<kind>`, the record otherwise.
 */
export function addUploadedFiles(project: TutorialProject, dir: string, files: globalThis.File[]): string[] {
  const kind = getUploadResourceKind(dir)
  if (kind != null) {
    if (validateResourceKind(kind) != null) throw new Error(`invalid resource kind ${kind}`)
    return files.map((nativeFile) => {
      const resource = new Resource(
        kind,
        deriveResourceName(project, kind, nativeFile.name),
        fromNativeFile(nativeFile)
      )
      project.addResource(resource)
      return resource.assetPath
    })
  }
  return files.map((nativeFile) => {
    const path = joinPath(dir, nativeFile.name)
    project.setExtraFile(path, fromNativeFile(nativeFile))
    return path
  })
}
