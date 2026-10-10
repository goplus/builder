/**
 * The Course Editor route carries the in-Course-Editor path, the path of what is open: `''` for the course itself,
 * `main_course.gox` for the course program, and so on. Under the embedded project's root, the rest of it is the
 * Project Editor's own in-editor path.
 */

/** The route param carrying the in-Course-Editor path; it is repeatable, so its value is an array of segments. */
export const inCourseEditorPathParam = 'inCourseEditorPath'

/**
 * Normalizes a route param into non-empty path segments. Both a repeatable param (an array) and a plain one (a
 * possibly slash-separated string) are accepted.
 */
export function paramToSegments(param: unknown): string[] {
  if (param == null) return []
  const raw = Array.isArray(param) ? param.map(String) : String(param).split('/')
  return raw.filter((segment) => segment !== '')
}

/** Splits a slash-separated path into its non-empty segments. */
export function pathToSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment !== '')
}

export function segmentsToPath(segments: string[]): string {
  return segments.join('/')
}

/**
 * Whether `path` is `dir` or lies under it, compared by segment: `assets/videos` is not within `assets/vid`. The empty
 * `dir` is the root and contains every path.
 */
export function isPathWithin(path: string, dir: string) {
  return dir === '' || path === dir || path.startsWith(dir + '/')
}
