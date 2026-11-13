import { client, type ByPage, type FileCollection, type PaginationParams } from './common'

export const courseTitleMaxLength = 200
/**
 * A prompt carries the lesson text together with its scaffold code, reference answer and
 * completion rules, so exercise and multi-sprite courses run several times longer than a plain
 * lesson. Kept in step with the API contract in `docs/openapi.yaml`.
 */
export const coursePromptMaxLength = 12000

/** The way a Course is delivered to the learner. */
export type CourseKind = 'guided' | 'playground'

export type CourseBase = {
  /** Unique identifier */
  id: string
  /** Username of the course's owner */
  owner: string
  /** Selects the Course content shape and learning flow. */
  kind: CourseKind
  /** Title of the course */
  title: string
  /** Universal URL of the course's thumbnail image */
  thumbnail: string
  createdAt: string
  updatedAt: string
}

export type GuidedCourse = CourseBase & {
  kind: 'guided'
  content: {
    /** Starting URL of the guided course */
    entrypoint: string
    /** Prompt for the Tutorial Copilot */
    prompt: string
  }
}

export type PlaygroundCourse = CourseBase & {
  kind: 'playground'
  /** Authored Tutorial-project files loaded into a session-local project for the learner. */
  content: FileCollection
}

export type Course = GuidedCourse | PlaygroundCourse

export function isGuidedCourse(course: Course): course is GuidedCourse {
  return course.kind === 'guided'
}

export function isPlaygroundCourse(course: Course): course is PlaygroundCourse {
  return course.kind === 'playground'
}

/** Get a course by ID */
export function getCourse(id: string, signal?: AbortSignal) {
  return client.get(`/courses/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<Course>
}

export type AddCourseParams =
  | Pick<GuidedCourse, 'kind' | 'title' | 'thumbnail' | 'content'>
  | Pick<PlaygroundCourse, 'kind' | 'title' | 'thumbnail' | 'content'>
/**
 * Fields to update; omitted fields keep their stored values. The union ties the shape of `content` to the course
 * kind, which itself cannot be changed.
 */
export type UpdateCourseParams =
  | Partial<Pick<GuidedCourse, 'title' | 'thumbnail' | 'content'>>
  | Partial<Pick<PlaygroundCourse, 'title' | 'thumbnail' | 'content'>>

/** Current unsaved Playground Course content used to generate its Copilot context. */
export type GeneratePlaygroundCourseCopilotContextParams = Pick<PlaygroundCourse, 'title' | 'thumbnail' | 'content'>

export type GeneratePlaygroundCourseCopilotContextResult = {
  copilotContext: string
}

/** Generates an editable Copilot context for an unsaved Playground Course. */
// The response waits for the model, which the server bounds at two minutes. A little longer here, so that a slow
// generation ends with the server's answer rather than a client timeout.
const copilotContextTimeout = 150 * 1000

export function generatePlaygroundCourseCopilotContext(
  params: GeneratePlaygroundCourseCopilotContextParams,
  signal?: AbortSignal
) {
  return client.post('/user/courses/playground/copilot-context', params, {
    signal,
    timeout: copilotContextTimeout
  }) as Promise<GeneratePlaygroundCourseCopilotContextResult>
}

/** Add a new course */
export function addCourse(params: AddCourseParams, signal?: AbortSignal) {
  return client.post('/user/courses', params, { signal }) as Promise<Course>
}

/** Update an existing course */
export function updateCourse(id: string, params: UpdateCourseParams, signal?: AbortSignal) {
  return client.patch(`/courses/${encodeURIComponent(id)}`, params, { signal }) as Promise<Course>
}

/** Delete a course */
export function deleteCourse(id: string) {
  return client.delete(`/courses/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCoursesParams = PaginationParams & {
  /** Filter courses by kind */
  kind?: CourseKind
  /** Filter courses by the course series ID */
  courseSeriesID?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'sequenceInCourseSeries'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export function listCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  return client.get('/courses', params, { signal }) as Promise<ByPage<Course>>
}

/** All courses of a course series, in their order in it, listed a page at a time. */
export async function listAllSeriesCourses(courseSeriesID: string, signal?: AbortSignal) {
  const all: Course[] = []
  for (let pageIndex = 1; ; pageIndex++) {
    const { data, total } = await listCourses(
      { courseSeriesID, pageIndex, pageSize: 100, orderBy: 'sequenceInCourseSeries' },
      signal
    )
    all.push(...data)
    if (data.length === 0 || all.length >= total) return all
  }
}

export function listSignedInUserCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  return client.get('/user/courses', params, { signal }) as Promise<ByPage<Course>>
}
