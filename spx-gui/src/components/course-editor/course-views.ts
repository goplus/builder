/**
 * The Course Editor shows a course as five views, one per part of it: the course itself (its settings), the
 * learner's project, the videos, the pictures and the course program. The activity bar switches between them.
 *
 * A view is addressed in the route by the path of what it edits: `''` for the course, the project root with the
 * Project Editor's own path after it, a resource kind's directory, `main_course.gox`. So every address the editor
 * has produced still leads somewhere: a path inside a view is shown by that view, and anything else -- a file the
 * course does not use, say -- by the course itself. Those records, and resource kinds other than videos and
 * pictures, are not shown at all; the model keeps them, and saving writes them back unchanged.
 */

import type { LocaleMessage } from '@/utils/i18n'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath } from '@/models/tutorial/project'
import { getResourceKindDir, imagesKind, videosKind } from '@/models/tutorial/resource'
import type { IconType } from '@/components/ui'
import { isPathWithin, pathToSegments } from './route'

/** One part of the course, as the activity bar offers it. */
export type CourseView = 'course' | 'project' | 'videos' | 'images' | 'program'

/** The views in the order the activity bar lists them. */
export const courseViews: CourseView[] = ['course', 'project', 'videos', 'images', 'program']

/** The resource kind each resource view shows. */
export const viewResourceKinds = { videos: videosKind, images: imagesKind } as const

/** A view that shows the resources of one kind. */
export type ResourceView = keyof typeof viewResourceKinds

/** What is open: a view, and for the project the Project Editor's own path inside it. */
export type OpenView = { view: Exclude<CourseView, 'project'> } | { view: 'project'; inEditorPath: string[] }

/**
 * What a view is called, in the activity bar's tooltips and in the view's own header.
 * @param view - The view.
 * @returns A localized label.
 * Called by: components/course-editor/CourseActivityBar.vue#template,
 * components/course-editor/CourseResourceGrid.vue (its header).
 */
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

/**
 * The icon a view is shown with in the activity bar.
 * @param view - The view.
 * @returns A `UIIcon` type.
 * Called by: components/course-editor/CourseActivityBar.vue#template.
 */
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

/**
 * The path a view lives at, which is where the activity bar navigates.
 * @param view - The view.
 * @param projectRoot - `config.project.root`, the embedded project's directory.
 * @returns The in-Course-Editor path of the view.
 * Called by: components/course-editor/CourseEditor.vue#openView, components/course-editor/course-views.ts#resolveView.
 */
export function getViewPath(view: CourseView, projectRoot: string): string {
  switch (view) {
    case 'course':
      return ''
    case 'project':
      return projectRoot
    case 'videos':
    case 'images':
      return getResourceKindDir(viewResourceKinds[view])
    case 'program':
      return mainCourseFilePath
  }
}

/**
 * The view that shows `path`, and the path it lives at. The project comes first: whatever is under its root is
 * the Project Editor's own path, which the project view keeps as it is. A path inside a resource kind's directory
 * (a single video, as earlier versions of the editor addressed one) is shown by that kind's view, and any other
 * path by the course.
 * @param path - The normalized in-Course-Editor path from the route; `''` for the course itself.
 * @param projectRoot - `config.project.root`.
 * @returns What is open, and the path the route should say; that path differs from `path` when `path` is not a
 *   view's own, so the editor can bring the URL in line with what it shows.
 * Called by: components/course-editor/CourseEditor.vue#resolved, components/course-editor/course-views.test.ts.
 */
export function resolveView(path: string, projectRoot: string): { open: OpenView; path: string } {
  if (path === '') return { open: { view: 'course' }, path }
  if (isPathWithin(path, projectRoot)) {
    return { open: { view: 'project', inEditorPath: pathToSegments(path.slice(projectRoot.length)) }, path }
  }
  if (path === mainCourseFilePath) return { open: { view: 'program' }, path }
  for (const view of ['videos', 'images'] as const) {
    const viewPath = getViewPath(view, projectRoot)
    if (isPathWithin(path, viewPath)) return { open: { view }, path: viewPath }
  }
  return { open: { view: 'course' }, path: '' }
}

/**
 * The views with unsaved changes, for the dots on the activity bar. A record belongs to the view that edits it;
 * records no view shows (unused files, other resource kinds) belong to none, and no view edits them anyway.
 * @param changedPaths - The result of `getChangedPaths`.
 * @param projectRoot - `config.project.root`.
 * @returns The views some changed record belongs to.
 * Called by: components/course-editor/CourseEditor.vue#dirtyViews, components/course-editor/course-views.test.ts.
 */
export function getDirtyViews(changedPaths: Set<string>, projectRoot: string): Set<CourseView> {
  const dirty = new Set<CourseView>()
  for (const path of changedPaths) {
    if (path === configFilePath) dirty.add('course')
    else if (path === mainCourseFilePath) dirty.add('program')
    else if (isPathWithin(path, projectRoot)) dirty.add('project')
    else if (isPathWithin(path, getViewPath('videos', projectRoot))) dirty.add('videos')
    else if (isPathWithin(path, getViewPath('images', projectRoot))) dirty.add('images')
  }
  return dirty
}

/**
 * Paths whose record differs between two exports: added, removed, or replaced by another `File` instance. Identity
 * comparison is enough because the model reuses `File` instances while their source is unchanged (`DerivedFile`
 * for generated records; edits always produce a new instance).
 *
 * @param baseline - The export taken at load or after the last successful save.
 * @param current - The export of the working copy now.
 * @returns The set of paths present in either export whose `File` differs (including `undefined` on one side).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#changedPaths
 * - components/course-editor/course-views.test.ts
 */
export function getChangedPaths(baseline: Files, current: Files): Set<string> {
  const changed = new Set<string>()
  // Union of both key sets so additions and removals are both seen.
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    if (baseline[path] !== current[path]) changed.add(path)
  }
  return changed
}
