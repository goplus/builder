/**
 * The Course Editor route carries an in-Course-Editor path naming what is open. A view is addressed by the path of
 * what it edits (`course-views.ts`): the empty path is the course itself, `main_course.gox` the course program,
 * `assets/videos` the videos, and so on. Under the embedded project's root the tail is the SPX Project Editor's own
 * in-editor path (mode and selection). Naming follows "in<Editor>Path":
 * every editor has one, and the Course Editor's path embeds the Project Editor's when the project is open.
 *
 * Everything in this module is pure string/array manipulation with no Vue or vue-router dependency, so it is
 * shared by the view model (`course-views.ts`), the upload policy (`upload.ts`) and the components alike.
 */

/**
 * Name of the vue-router param that carries the in-Course-Editor path. The route record in
 * `apps/xbuilder/router.ts` declares it as `:inCourseEditorPath*` (a repeatable param), so vue-router hands the
 * value over as an array of decoded segments (or `undefined` when the URL has no tail) and accepts an array of
 * segments when navigating. Every reader and writer of the param goes through this constant so the name lives in
 * one place.
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#activePath (reads the param of the current route)
 * - components/course-editor/CourseEditor.vue#openPath (writes the param when navigating)
 * - components/course-editor/project/SpxProjectEditorHost.vue#isProjectDocRoute
 * - components/course-editor/project/SpxProjectEditorHost.vue#projectInEditorPath
 * - components/course-editor/project/SpxProjectEditorHost.vue#translateRoute (drops it from the translated route)
 * - components/course-editor/project/SpxProjectEditorHost.vue#editorRouter.push (prefixes the project root)
 * - components/course-editor/project/SpxProjectEditorHost.vue#restoreProjectRoute (restores the last route)
 */
export const inCourseEditorPathParam = 'inCourseEditorPath'

/**
 * Normalize a route param (string or string array) into non-empty path segments. vue-router gives a repeatable
 * param (`:name*`) as an array and a plain param as a string; both shapes are accepted so callers need not care
 * how the route record was declared. Empty segments (from doubled or trailing slashes) are dropped.
 *
 * @param param - The raw value read from `route.params[...]`: `undefined`/`null` when absent, a string, or an
 *   array of strings (any other value is stringified).
 * @returns The non-empty segments in order; `[]` when the param is absent or empty.
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#activePath
 * - components/course-editor/project/SpxProjectEditorHost.vue#isProjectDocRoute
 * - components/course-editor/project/SpxProjectEditorHost.vue#projectInEditorPath
 * - components/course-editor/project/SpxProjectEditorHost.vue#editorRouter.push (on the target's `inEditorPath`)
 * - components/course-editor/project/SpxProjectEditorHost.vue#restoreProjectRoute (on the remembered route)
 */
export function paramToSegments(param: unknown): string[] {
  // An absent param (a route without a tail) is the empty path.
  if (param == null) return []
  // Arrays come from repeatable params; strings (possibly slash-separated) from plain params.
  const raw = Array.isArray(param) ? param.map(String) : String(param).split('/')
  // Drop empty segments so `a//b/` and `a/b` describe the same path.
  return raw.filter((segment) => segment !== '')
}

/**
 * Split a slash-separated path into its non-empty segments. Leading, trailing and doubled slashes are ignored,
 * so this doubles as a path normalizer when combined with `segmentsToPath`.
 *
 * @param path - A path such as `assets/videos/step-to`; the empty string is the course root.
 * @returns The non-empty segments in order; `[]` for the root.
 *
 * Called by:
 * - components/course-editor/course-views.ts#resolveView (the tail under the project root)
 * - components/course-editor/CourseEditor.vue#openPath (the segments written into the route param)
 */
export function pathToSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment !== '')
}

/**
 * Join path segments back into a slash-separated path without leading or trailing slash. The inverse of
 * `pathToSegments` for already-normalized input.
 *
 * @param segments - Non-empty segments in order.
 * @returns The joined path; the empty string for no segments (the course root).
 *
 * Called by:
 * - components/course-editor/CourseEditor.vue#activePath
 */
export function segmentsToPath(segments: string[]): string {
  return segments.join('/')
}

/**
 * Whether `path` equals `dir` or lies under it. The empty `dir` is the root and contains every path. The check is
 * segment-aware: `assets/videos` is not within `assets/vid`, because the prefix compared is `dir + '/'`.
 *
 * @param path - The path to test, normalized (no leading/trailing slash).
 * @param dir - The directory that may contain it, normalized; `''` for the course root.
 * @returns `true` when `path` is `dir` itself or a descendant of it.
 *
 * Called by:
 * - components/course-editor/course-views.ts#resolveView (which view a path belongs to)
 * - components/course-editor/course-views.ts#getDirtyViews (which view a changed record belongs to)
 * - components/course-editor/upload.ts#validateResourceUpload (the project root check)
 */
export function isPathWithin(path: string, dir: string) {
  return dir === '' || path === dir || path.startsWith(dir + '/')
}
