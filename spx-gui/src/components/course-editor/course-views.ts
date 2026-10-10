/**
 * The Course Editor shows a course as views, one per part of it: the course itself (its settings), the learner's
 * project, the videos and the course program. A view is addressed in the route by the path of what it edits.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath } from '@/models/tutorial/project'
import { imageAssetPath } from '@/models/tutorial/image'
import { videoAssetPath } from '@/models/tutorial/video'
import type { IconType } from '@/components/ui'
import { isPathWithin, pathToSegments } from './route'

export type CourseView = 'course' | 'project' | 'videos' | 'images' | 'program'

/**
 * The views in display order. The images view is hidden until the course format defines images and some course API
 * uses them; the model still loads and saves the images a course has.
 */
export const courseViews: CourseView[] = ['course', 'project', 'videos', 'program']

export type ResourceView = 'videos' | 'images'

export type OpenView = { view: Exclude<CourseView, 'project'> } | { view: 'project'; inEditorPath: string[] }

export function getViewLabel(view: CourseView): LocaleMessage {
  switch (view) {
    case 'course':
      return { en: 'Course', zh: '课程' }
    case 'project':
      return { en: 'Project', zh: '项目' }
    case 'videos':
      return { en: 'Videos', zh: '视频' }
    case 'images':
      return { en: 'Pictures', zh: '图片' }
    case 'program':
      return { en: 'Program', zh: '程序' }
  }
}

export function getViewIcon(view: CourseView): IconType {
  switch (view) {
    case 'course':
      return 'graduationCap'
    case 'project':
      return 'gamepad'
    case 'videos':
      return 'video'
    case 'images':
      return 'picture'
    case 'program':
      return 'code'
  }
}

export function getViewPath(view: CourseView, projectRoot: string): string {
  switch (view) {
    case 'course':
      return ''
    case 'project':
      return projectRoot
    case 'videos':
      return videoAssetPath
    case 'images':
      return imageAssetPath
    case 'program':
      return mainCourseFilePath
  }
}

/**
 * The view that shows `path`, and the path the route should say, which differs from `path` when `path` is not a
 * view's own. A path inside the videos' directory (a single video, as earlier versions of the editor addressed one)
 * is shown by the videos view, and any other path by the course.
 */
export function resolveView(path: string, projectRoot: string): { open: OpenView; path: string } {
  if (path === '') return { open: { view: 'course' }, path }
  if (isPathWithin(path, projectRoot)) {
    return { open: { view: 'project', inEditorPath: pathToSegments(path.slice(projectRoot.length)) }, path }
  }
  if (path === mainCourseFilePath) return { open: { view: 'program' }, path }
  if (isPathWithin(path, videoAssetPath)) return { open: { view: 'videos' }, path: videoAssetPath }
  return { open: { view: 'course' }, path: '' }
}

/** The views that edit some changed record. A record that no view edits marks none, not even the course. */
export function getDirtyViews(changedPaths: Set<string>, projectRoot: string): Set<CourseView> {
  const dirty = new Set<CourseView>()
  for (const path of changedPaths) {
    if (path === configFilePath) dirty.add('course')
    else if (path === mainCourseFilePath) dirty.add('program')
    else if (isPathWithin(path, projectRoot)) dirty.add('project')
    else if (isPathWithin(path, videoAssetPath)) dirty.add('videos')
    else if (isPathWithin(path, imageAssetPath)) dirty.add('images')
  }
  return dirty
}

/**
 * Paths whose record differs between two exports: added, removed, or replaced by another `File` instance. Identity
 * comparison is enough because the model reuses `File` instances while their source is unchanged (generated
 * records are kept in computeds; edits always produce a new instance).
 */
export function getChangedPaths(baseline: Files, current: Files): Set<string> {
  const changed = new Set<string>()
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    if (baseline[path] !== current[path]) changed.add(path)
  }
  return changed
}
