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

/**
 * The backend omits `references` from course payloads when it is empty, while the `Course` type
 * (and consumers like the tutorial's topic builder) promise an array. Normalize at this boundary
 * so no consumer has to know about the omission.
 */
function normalizeCourse(course: Course): Course {
  course.references ??= []
  return course
}

/** Get a course by ID */
export async function getCourse(id: string, signal?: AbortSignal) {
  const course = (await client.get(`/courses/${encodeURIComponent(id)}`, undefined, { signal })) as Course
  return normalizeCourse(course)
}

export type AddUpdateCourseParams = Pick<Course, 'title' | 'thumbnail' | 'entrypoint' | 'prompt'>

/** Add a new course */
export async function addCourse(params: AddUpdateCourseParams, signal?: AbortSignal) {
  const course = (await client.post('/user/courses', params, { signal })) as Course
  return normalizeCourse(course)
}

/** Update an existing course */
export async function updateCourse(id: string, params: AddUpdateCourseParams, signal?: AbortSignal) {
  const course = (await client.patch(`/courses/${encodeURIComponent(id)}`, params, { signal })) as Course
  return normalizeCourse(course)
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

export async function listCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  const ret = (await client.get('/courses', params, { signal })) as ByPage<Course>
  ret.data.forEach(normalizeCourse)
  return ret
}

export async function listSignedInUserCourses(params?: ListCoursesParams, signal?: AbortSignal) {
  const ret = (await client.get('/user/courses', params, { signal })) as ByPage<Course>
  ret.data.forEach(normalizeCourse)
  return ret
}
