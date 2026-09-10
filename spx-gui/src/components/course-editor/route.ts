/**
 * The Course Editor route carries an in-Course-Editor path naming the open node of the course explorer. Nodes
 * are addressed by the path of the record(s) they stand for: the empty path is the course itself, `main_course.gox`
 * the course program, `assets/videos/<name>` a video package, and so on. Under the embedded project's root the
 * tail is the SPX Project Editor's own in-editor path (mode and selection). Naming follows "in<Editor>Path":
 * every editor has one, and the Course Editor's path embeds the Project Editor's when the project is open.
 */

export const inCourseEditorPathParam = 'inCourseEditorPath'

/** Normalize a route param (string or string array) into non-empty path segments. */
export function paramToSegments(param: unknown): string[] {
  if (param == null) return []
  const raw = Array.isArray(param) ? param.map(String) : String(param).split('/')
  return raw.filter((segment) => segment !== '')
}

export function pathToSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment !== '')
}

export function segmentsToPath(segments: string[]): string {
  return segments.join('/')
}

/** Whether `path` equals `dir` or lies under it. The empty `dir` is the root and contains every path. */
export function isPathWithin(path: string, dir: string) {
  return dir === '' || path === dir || path.startsWith(dir + '/')
}

/** The directory part of `path`; the empty string for a top-level path. */
export function dirname(path: string) {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash)
}
