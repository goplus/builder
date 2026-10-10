/**
 * A Playground Course is opened in the Course Editor through its series (Preview needs it to know what comes next),
 * while course management lists courses on their own, so opening one has to find its series first.
 */

import { getCourseSeries, listSignedInUserCourseSeries, type CourseSeries } from '@/apis/course-series'
import type { UpdateCourseSeries } from '@/stores/course-series'

/** Only the first page is read: an author is not expected to have more Playground Course series than this. */
const seriesPageSize = 100

export async function listPlaygroundSeries(): Promise<CourseSeries[]> {
  const { data } = await listSignedInUserCourseSeries({
    kind: 'playground',
    pageSize: seriesPageSize,
    pageIndex: 1,
    orderBy: 'order',
    sortOrder: 'asc'
  })
  return data
}

/** The first of the signed-in author's series that holds the course, or null if none does. */
export async function findSeriesOfCourse(courseID: string): Promise<CourseSeries | null> {
  const series = await listPlaygroundSeries()
  return series.find((item) => item.courseIDs.includes(courseID)) ?? null
}

/**
 * Put a course at the end of a series, unless it is already there (e.g. a retry after a lost response).
 * The series is read right before the write and only its course list is sent, so courses added and fields edited
 * meanwhile are not overwritten. A gap between the read and the write remains; closing it needs a server-side append.
 */
export async function appendCourseToSeries(
  courseSeriesID: string,
  courseID: string,
  updateCourseSeries: UpdateCourseSeries
): Promise<CourseSeries> {
  const current = await getCourseSeries(courseSeriesID)
  if (current.courseIDs.includes(courseID)) return current
  return updateCourseSeries(courseSeriesID, { courseIDs: [...current.courseIDs, courseID] })
}
