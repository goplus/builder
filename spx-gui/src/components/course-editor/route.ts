/**
 * The Course Editor route carries an in-Course-Editor path telling which document is open:
 * `program`, `info`, `videos[/<name>]`, or `project[/<inEditorPath>]`, where the tail after `project` is the
 * SPX Project Editor's own in-editor path (mode and selection). Naming follows "in<Editor>Path": every editor
 * has one, and the Course Editor's path embeds the Project Editor's when the project document is open.
 */

export const inCourseEditorPathParam = 'inCourseEditorPath'

export const projectDocSegment = 'project'

export type CourseDoc =
  | { type: 'program' }
  | { type: 'info' }
  | { type: 'videos'; name: string | null }
  | { type: 'project'; inEditorPath: string[] }

/** Normalize a route param (string or string array) into non-empty path segments. */
export function paramToSegments(param: unknown): string[] {
  if (param == null) return []
  const raw = Array.isArray(param) ? param.map(String) : String(param).split('/')
  return raw.filter((segment) => segment !== '')
}

/** The document a route param points at; the course program when the param names nothing. */
export function parseCourseDoc(param: unknown): CourseDoc {
  const [head, ...rest] = paramToSegments(param)
  switch (head) {
    case 'info':
      return { type: 'info' }
    case 'videos':
      return { type: 'videos', name: rest[0] ?? null }
    case projectDocSegment:
      return { type: 'project', inEditorPath: rest }
    default:
      return { type: 'program' }
  }
}

export function toInCourseEditorPath(doc: CourseDoc): string[] {
  switch (doc.type) {
    case 'program':
      return ['program']
    case 'info':
      return ['info']
    case 'videos':
      return doc.name == null ? ['videos'] : ['videos', doc.name]
    case 'project':
      return [projectDocSegment, ...doc.inEditorPath]
  }
}
