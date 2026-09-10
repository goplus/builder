/**
 * Upload policy of the course explorer. Where a file may land follows the ownership of the tree:
 * - `assets/` holds resources addressed by the course program, so it only contains packages: uploading into a
 *   resource-kind folder (`assets/videos`) creates a package with its manifest, whatever the file's extension;
 *   `assets/` itself, unknown kinds and package directories refuse uploads.
 * - the embedded project's directory belongs to the Project Editor, and fixed-path records have their own editors.
 * - anywhere else the file becomes a plain record, kept but unused by the course.
 * New folders are not a feature of their own: a directory exists as soon as a record's path names it.
 */

import type { LocaleMessage } from '@/utils/i18n'
import { stripExt } from '@/utils/path'
import { fromNativeFile } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, type TutorialProject } from '@/models/tutorial/project'
import { getVideoAssetPath, getVideoName, validateVideoName, Video, videoAssetPath } from '@/models/tutorial/video'
import { isPathWithin, pathToSegments, segmentsToPath } from './route'

export const assetsDir = 'assets'

/** Directories under `assets/` whose uploads become packages, by resource kind the course format defines. */
export const resourceKindDirs: readonly string[] = [videoAssetPath]

export function isResourceKindDir(dir: string) {
  return resourceKindDirs.includes(dir)
}

/** Normalize a user-typed directory: no leading/trailing/duplicate slashes; the empty string is the course root. */
export function normalizeDir(dir: string) {
  return segmentsToPath(pathToSegments(dir))
}

export function joinPath(dir: string, name: string) {
  return dir === '' ? name : `${dir}/${name}`
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
      en: `Choose a resource type folder under ${assetsDir} (supported: ${resourceKindDirs.join(', ')})`,
      zh: `请选择 ${assetsDir} 下的资源类型目录（当前支持：${resourceKindDirs.join('、')}）`
    }
  }
  if (isPathWithin(dir, assetsDir) && !isResourceKindDir(dir)) {
    return {
      en: `Under ${assetsDir}, only resource type folders accept uploads (supported: ${resourceKindDirs.join(', ')}); packages are managed by the editor`,
      zh: `${assetsDir} 下只有资源类型目录可以上传（当前支持：${resourceKindDirs.join('、')}），包的内容由编辑器管理`
    }
  }
  return null
}

/** Why `name` cannot be uploaded into `dir` as a plain record, or null when it can. */
export function validateUploadPath(project: TutorialProject, dir: string, name: string): LocaleMessage | null {
  const dirError = validateUploadDir(project, dir)
  if (dirError != null) return dirError
  if (isResourceKindDir(dir)) return null
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
  if (isResourceKindDir(dir)) return []
  return names.map((name) => joinPath(dir, name)).filter((path) => project.getExtraFile(path) != null)
}

export function deriveVideoName(project: TutorialProject, fileName: string) {
  const base = stripExt(fileName)
  // Derive the video name from the file name when it is usable, otherwise start from a generic name.
  return getVideoName(project, validateVideoName(base, null) == null ? base : 'video')
}

/**
 * Put uploaded files into the course under `dir`, which must have passed validation. Returns the path of the node
 * created for each file: the package for a resource-kind folder, the record otherwise.
 */
export function addUploadedFiles(project: TutorialProject, dir: string, files: globalThis.File[]): string[] {
  if (dir === videoAssetPath) {
    return files.map((nativeFile) => {
      const name = deriveVideoName(project, nativeFile.name)
      project.addVideo(new Video(name, fromNativeFile(nativeFile)))
      return getVideoAssetPath(name)
    })
  }
  return files.map((nativeFile) => {
    const path = joinPath(dir, nativeFile.name)
    project.setExtraFile(path, fromNativeFile(nativeFile))
    return path
  })
}
