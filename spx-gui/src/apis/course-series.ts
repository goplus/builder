import { client, type ByPage, type PaginationParams } from './common'

export type CourseSeries = {
  /** Unique identifier */
  id: string
  /** Username of the course series's owner */
  owner: string
  /** Title of the course series */
  title: string
  /** Array of course IDs that included in this series */
  courseIDs: string[]
  /** Order/priority of the course series for sorting */
  order: number
}

/** Get a course series by ID */
export async function getCourseSeries(id: string, signal?: AbortSignal) {
  return client.get(`/course-series/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<CourseSeries>
}

export type AddUpdateCourseSeriesParams = Pick<CourseSeries, 'title' | 'courseIDs' | 'order'>

/** Add a new course series */
export async function addCourseSeries(params: AddUpdateCourseSeriesParams, signal?: AbortSignal) {
  return client.post('/course-series', params, { signal }) as Promise<CourseSeries>
}

/** Update an existing course series */
export async function updateCourseSeries(id: string, params: AddUpdateCourseSeriesParams, signal?: AbortSignal) {
  return client.put(`/course-series/${encodeURIComponent(id)}`, params, { signal }) as Promise<CourseSeries>
}

/** Delete a course series */
export async function deleteCourseSeries(id: string) {
  return client.delete(`/course-series/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCourseSeriesParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'order'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listCourseSeries(params?: ListCourseSeriesParams, signal?: AbortSignal) {
  return client.get('/course-serieses/list', params, { signal }) as Promise<ByPage<CourseSeries>>
}
