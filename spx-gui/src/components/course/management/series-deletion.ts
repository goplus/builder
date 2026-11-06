import { capture, DefaultException } from '@/utils/exception'
import { getCourseSeries } from '@/apis/course-series'
import type { DeleteCourse } from '@/stores/course'
import type { DeleteCourseSeries } from '@/stores/course-series'

export type CourseSeriesDeletionWrites = {
  deleteCourse: DeleteCourse
  deleteCourseSeries: DeleteCourseSeries
}

/**
 * Delete a series together with its courses, each of which belongs to that series alone. The courses go first, and the
 * series only once all of them are gone, so that a failure leaves the courses not deleted still in the series rather
 * than in no series. The series is read first, for the courses it holds now.
 */
export async function deleteCourseSeriesWithCourses(courseSeriesID: string, writes: CourseSeriesDeletionWrites) {
  const { courseIDs } = await getCourseSeries(courseSeriesID)
  const results = await Promise.allSettled(courseIDs.map((id) => writes.deleteCourse(id)))
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length > 0) {
    for (const failure of failures) capture(failure.reason, 'failed to delete a course of a course series')
    const deleted = courseIDs.length - failures.length
    throw new DefaultException({
      en: `${deleted} of ${courseIDs.length} courses were deleted, but ${failures.length} could not be. The course series is kept with the courses left; try deleting it again.`,
      zh: `已删除 ${deleted} 门课程，另有 ${failures.length} 门没能删除。课程系列和剩下的课程都还在，可以再试一次。`
    })
  }
  await writes.deleteCourseSeries(courseSeriesID)
}
