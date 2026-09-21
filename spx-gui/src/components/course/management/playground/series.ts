/**
 * A Playground Course is opened in the Course Editor through the series it is written for: the editor's route
 * pairs the two, and Preview needs the series to know what comes next. Course management lists courses on their
 * own, so opening one has to find its series first.
 */

import { listSignedInUserCourseSeries, type CourseSeries } from '@/apis/course-series'

/** How many series are looked through; an author with more Playground Course series than this is not expected. */
const seriesPageSize = 100

/**
 * The signed-in author's Playground Course series, in their display order.
 * @returns The series, first page only (see `seriesPageSize`).
 * Called by: components/course/management/playground/series.ts#findSeriesOfCourse,
 * components/course/management/playground/PlaygroundCourseEditModal.vue (the series to create a course in).
 */
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

/**
 * The series a Playground Course belongs to, among the signed-in author's own.
 * @param courseID - The course to look for.
 * @returns The first series holding the course, or null when none of the author's series does.
 * Called by: components/course/management/CourseManagementModal.vue#handleOpenInCourseEditor,
 * components/course/management/playground/series.test.ts.
 */
export async function findSeriesOfCourse(courseID: string): Promise<CourseSeries | null> {
  const series = await listPlaygroundSeries()
  return series.find((item) => item.courseIDs.includes(courseID)) ?? null
}
