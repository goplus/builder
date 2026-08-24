import { client, type ByPage, type PaginationParams } from './common'

export const courseTitleMaxLength = 200
/**
 * A prompt carries the lesson text together with its scaffold code, reference answer and
 * completion rules, so exercise and multi-sprite courses run several times longer than a plain
 * lesson. Kept in step with the API contract in `docs/openapi.yaml`.
 */
export const coursePromptMaxLength = 12000

export type Course = {
  /** Unique identifier */
  id: string
  /** Username of the course's owner */
  owner: string
  /** Title of the course */
  title: string
  /** Universal URL of the course's thumbnail image */
  thumbnail: string
  /** Starting URL of the course */
  entrypoint: string
  /** Prompt (for copilot) of the course */
  prompt: string
}

/** Get a course by ID */
export function getCourse(id: string, signal?: AbortSignal) {
  return client.get(`/courses/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<Course>
}

export type AddUpdateCourseParams = Pick<Course, 'title' | 'thumbnail' | 'entrypoint' | 'prompt'>

/** Add a new course */
export function addCourse(params: AddUpdateCourseParams, signal?: AbortSignal) {
  return client.post('/user/courses', params, { signal }) as Promise<Course>
}

/** Update an existing course */
export function updateCourse(id: string, params: AddUpdateCourseParams, signal?: AbortSignal) {
  return client.patch(`/courses/${encodeURIComponent(id)}`, params, { signal }) as Promise<Course>
}

/** Delete a course */
export function deleteCourse(id: string) {
  return client.delete(`/courses/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCoursesParams = PaginationParams & {
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

export function listSignedInUserCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  return client.get('/user/courses', params, { signal }) as Promise<ByPage<Course>>
}
