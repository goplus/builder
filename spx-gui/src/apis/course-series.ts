import { client, type ByPage, type PaginationParams } from './common'
import type { CourseKind } from './course'
import { getPlaygroundMockCourseSeries } from './course-playground-mock'

export const courseSeriesTitleMaxLength = 200
export const courseSeriesDescriptionMaxLength = 400

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
  /** Order/priority of the course series for sorting */
  order: number
  createdAt: string
  updatedAt: string
}

type LegacyGuidedCourseSeries = Omit<CourseSeries, 'kind'>

function normalizeCourseSeries(series: CourseSeries | LegacyGuidedCourseSeries): CourseSeries {
  if ('kind' in series) return series
  return { ...series, kind: 'guided' }
}

/** Get a course series by ID */
export async function getCourseSeries(id: string, signal?: AbortSignal) {
  const mockCourseSeries = await getPlaygroundMockCourseSeries(id, signal)
  if (mockCourseSeries != null) return mockCourseSeries
  const series = (await client.get(`/course-series/${encodeURIComponent(id)}`, undefined, { signal })) as
    | CourseSeries
    | LegacyGuidedCourseSeries
  return normalizeCourseSeries(series)
}

export type AddCourseSeriesParams = Pick<
  CourseSeries,
  'kind' | 'title' | 'thumbnail' | 'description' | 'courseIDs' | 'order'
>
/** Fields to update; omitted fields keep their stored values. */
export type UpdateCourseSeriesParams = Partial<
  Pick<CourseSeries, 'title' | 'thumbnail' | 'description' | 'courseIDs' | 'order'>
>

/** Add a new course series */
export async function addCourseSeries(params: AddCourseSeriesParams, signal?: AbortSignal) {
  const series = (await client.post('/user/course-series', params, { signal })) as
    | CourseSeries
    | LegacyGuidedCourseSeries
  return normalizeCourseSeries(series)
}

/** Update an existing course series */
export async function updateCourseSeries(id: string, params: UpdateCourseSeriesParams, signal?: AbortSignal) {
  const series = (await client.patch(`/course-series/${encodeURIComponent(id)}`, params, { signal })) as
    | CourseSeries
    | LegacyGuidedCourseSeries
  return normalizeCourseSeries(series)
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

export async function listCourseSeries(params?: ListCourseSeriesParams, signal?: AbortSignal) {
  const result = (await client.get('/course-series', params, { signal })) as ByPage<
    CourseSeries | LegacyGuidedCourseSeries
  >
  return { ...result, data: result.data.map(normalizeCourseSeries) }
}

export async function listSignedInUserCourseSeries(params?: ListCourseSeriesParams, signal?: AbortSignal) {
  const result = (await client.get('/user/course-series', params, { signal })) as ByPage<
    CourseSeries | LegacyGuidedCourseSeries
  >
  return { ...result, data: result.data.map(normalizeCourseSeries) }
}
