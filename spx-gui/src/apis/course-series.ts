import { client, type ByPage, type PaginationParams } from './common'
import type { CourseKind } from './course'

export const courseSeriesTitleMaxLength = 200
export const courseSeriesDescriptionMaxLength = 400
export const courseSeriesUnitTitleMaxLength = 100

/** A unit of a course series: a titled run of its courses. */
export type CourseSeriesUnit = {
  /** Unique identifier, given by the server when the unit is created */
  id: string
  /** Title of the unit */
  title: string
  /** IDs of the courses in the unit, in order */
  courseIDs: string[]
}

export type CourseSeries = {
  /** Unique identifier */
  id: string
  /** Username of the course series's owner */
  owner: string
  /** Selects the Course kinds included in this series. */
  kind: CourseKind
  /** Title of the course series */
  title: string
  /** Universal URL of the course series's thumbnail image */
  thumbnail: string
  /** Description of the course series */
  description: string
  /** Array of course IDs that included in this series */
  courseIDs: string[]
  /**
   * Units the series is divided into, empty if it is not. Their course IDs, joined in unit order, are `courseIDs`.
   * While the series is divided into units, its courses change only through `units`.
   */
  units: CourseSeriesUnit[]
  /** Order/priority of the course series for sorting */
  order: number
  createdAt: string
  updatedAt: string
}

/** Get a course series by ID */
export function getCourseSeries(id: string, signal?: AbortSignal) {
  return client.get(`/course-series/${encodeURIComponent(id)}`, undefined, { signal }) as Promise<CourseSeries>
}

/** A unit to write: one without `id` is a new unit, which the server gives an ID. */
export type CourseSeriesUnitParams = Pick<CourseSeriesUnit, 'title' | 'courseIDs'> & { id?: string }

export type AddCourseSeriesParams = Pick<
  CourseSeries,
  'kind' | 'title' | 'thumbnail' | 'description' | 'courseIDs' | 'order'
> & {
  units?: CourseSeriesUnitParams[]
}
/** Fields to update; omitted fields keep their stored values. */
export type UpdateCourseSeriesParams = Partial<
  Pick<CourseSeries, 'title' | 'thumbnail' | 'description' | 'courseIDs' | 'order'> & {
    /** Replaces the units, and with them the courses unless empty. */
    units: CourseSeriesUnitParams[]
  }
>

/** Add a new course series */
export function addCourseSeries(params: AddCourseSeriesParams, signal?: AbortSignal) {
  return client.post('/user/course-series', params, { signal }) as Promise<CourseSeries>
}

/** Update an existing course series */
export function updateCourseSeries(id: string, params: UpdateCourseSeriesParams, signal?: AbortSignal) {
  return client.patch(`/course-series/${encodeURIComponent(id)}`, params, { signal }) as Promise<CourseSeries>
}

/** Delete a course series */
export function deleteCourseSeries(id: string) {
  return client.delete(`/course-series/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListCourseSeriesParams = PaginationParams & {
  kind?: CourseKind
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
