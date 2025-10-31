import { client, type ByPage, type PaginationParams } from './common'

export type ProjectReference = {
  type: 'project'
  /** Full name of the project, in the format `owner/project`. */
  fullName: string
}

export type Reference = ProjectReference // We may support more reference types in the future

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
  /** References of the course */
  references: Reference[]
  /** Prompt (for copilot) of the course */
  prompt: string
}

/** Get a course by ID */
export async function getCourse(id: string, signal?: AbortSignal) {
  return client.get(`/course/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<Course>
}

export type AddUpdateCourseParams = Pick<Course, 'title' | 'thumbnail' | 'entrypoint' | 'references' | 'prompt'>

/** Add a new course */
export async function addCourse(params: AddUpdateCourseParams, signal?: AbortSignal) {
  return client.post('/course', params, { signal }) as Promise<Course>
}

/** Update an existing course */
export async function updateCourse(id: string, params: AddUpdateCourseParams, signal?: AbortSignal) {
  return client.put(`/course/${encodeURIComponent(id)}`, params, { signal }) as Promise<Course>
}

/** Delete a course */
export async function deleteCourse(id: string) {
  return client.delete(`/course/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCourseParams = PaginationParams & {
  /** Filter courses by the course series ID */
  courseSeriesID?: string
  /**
   * Filter courses by the owner's username.
   * Defaults to the authenticated user if not specified. Use * to include courses from all users.
   **/
  owner?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listCourse(params: ListCourseParams, signal?: AbortSignal) {
  return client.get('/courses/list', params, { signal }) as Promise<ByPage<Course>>
}

/** Get all courses that match the given filters; returns at most 100 items. */
export async function listAllCourses(params: Omit<ListCourseParams, keyof PaginationParams>, signal?: AbortSignal) {
  const { data } = await listCourse({ ...params, pageIndex: 1, pageSize: 100 }, signal)
  return data
}
