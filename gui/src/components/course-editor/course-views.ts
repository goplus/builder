/**
 * The Course Editor shows a course as views, one per part of it: the course itself (its settings), the learner's
 * project, the videos and the course program. Views have fixed route identifiers independent of course file paths.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath } from '@/models/tutorial/project'
import { imageAssetPath } from '@/models/tutorial/image'
import { videoAssetPath } from '@/models/tutorial/video'
import type { IconType } from '@/components/ui'
import type { PathSegments } from '@/utils/route'

export type CourseView = 'course' | 'project' | 'videos' | 'images' | 'program'

/**
 * The views in display order. The images view is hidden until the course format defines images and some course API
 * uses them; the model still loads and saves the images a course has.
 */
export const courseViews: CourseView[] = ['course', 'project', 'videos', 'program']

export type ResourceView = 'videos' | 'images'

export type OpenView = { view: CourseView }

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

export function getViewPath(view: CourseView): PathSegments {
  return view === 'course' ? [] : [view]
}

export function resolveView(path: PathSegments): { open: OpenView; path: PathSegments } {
  const view = courseViews.find((view) => view === path[0]) ?? 'course'
  return { open: { view }, path: view === 'project' ? path : getViewPath(view) }
}

/**
 * Whether `path` is `dir` or lies under it, compared by segment: `assets/videos` is not within `assets/vid`. The empty
 * `dir` is the root and contains every path.
 */
function isPathWithin(path: string, dir: string) {
  return dir === '' || path === dir || path.startsWith(dir + '/')
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
