import { client, type ByPage, type PaginationParams } from './common'

export type CourseSeries = {
  /** Unique identifier */
  id: string
  /** Username of the course series's owner */
  owner: string
  /** Title of the course series */
  title: string
  /** Universal URL of the course series's thumbnail image */
  thumbnail: string
  /** Description of the course series */
  description: string
  /** Array of course IDs that included in this series */
  courseIDs: string[]
  /** Order/priority of the course series for sorting */
  order: number
  createdAt: string
  updatedAt: string
}

/** Get a course series by ID */
export function getCourseSeries(id: string, signal?: AbortSignal) {
  return client.get(`/course-series/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<CourseSeries>
}

export type AddUpdateCourseSeriesParams = Pick<
  CourseSeries,
  'title' | 'thumbnail' | 'description' | 'courseIDs' | 'order'
>

/** Add a new course series */
export function addCourseSeries(params: AddUpdateCourseSeriesParams, signal?: AbortSignal) {
  return client.post('/user/course-series', params, { signal }) as Promise<CourseSeries>
}

/** Update an existing course series */
export function updateCourseSeries(id: string, params: AddUpdateCourseSeriesParams, signal?: AbortSignal) {
  return client.patch(`/course-series/${encodeURIComponent(id)}`, params, { signal }) as Promise<CourseSeries>
}

/** Delete a course series */
export function deleteCourseSeries(id: string) {
  return client.delete(`/course-series/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCourseSeriesParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'order'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export function listCourseSeries(params?: ListCourseSeriesParams, signal?: AbortSignal) {
  return client.get('/course-series', params, { signal }) as Promise<ByPage<CourseSeries>>
}

export function listSignedInUserCourseSeries(params?: ListCourseSeriesParams, signal?: AbortSignal) {
  return client.get('/user/course-series', params, { signal }) as Promise<ByPage<CourseSeries>>
}
