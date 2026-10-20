/**
 * A course belongs to exactly one series, so it is only ever created in one: the course is created, then added at the
 * end of its series. These are two requests that can fail separately.
 */

import { capture, DefaultException } from '@/utils/exception'
import { addCourse, deleteCourse, type AddCourseParams, type Course } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import type { UpdateCourseSeries } from '@/stores/course-series'

/**
 * One attempt at creating a course in a series, kept across retries. Once the course exists, running again only retries
 * adding it, so a failed add followed by another "Create" does not leave a second course behind. Giving up deletes a
 * course that was not added, which would otherwise be in no series.
 */
export class CourseCreation {
  private created: Course | null = null
  private added = false

  constructor(
    private courseSeriesID: string,
    private updateCourseSeries: UpdateCourseSeries
  ) {}

  get createdCourse() {
    return this.created
  }

  /** Create the course from what `getParams` gives, unless an earlier run already did, then add it to the series. */
  async run(getParams: () => Promise<AddCourseParams>): Promise<{ course: Course; courseSeries: CourseSeries }> {
    if (this.created == null) this.created = await addCourse(await getParams())
    const course = this.created
    try {
      const courseSeries = await appendCourseToSeries(this.courseSeriesID, course.id, this.updateCourseSeries)
      this.added = true
      return { course, courseSeries }
    } catch (cause) {
      capture(cause, 'failed to add a new course to its series')
      throw new DefaultException({
        en: `"${course.title}" was created, but adding it to the course series failed. Click "Create" again to retry adding it; no second course will be created.`,
        zh: `"${course.title}"已经创建，但加入课程系列失败。再点一次"创建"只会重试加入，不会再建一门课。`
      })
    }
  }

  /**
   * Delete the course if it was created but not added to the series. Not to be called while `run` is under way: a
   * course still being created or added would be missed, or deleted while it is being added.
   */
  async abandon() {
    const course = this.created
    if (course == null || this.added) return
    this.created = null
    try {
      await deleteCourse(course.id)
    } catch (e) {
      capture(e, 'failed to delete a new course that was not added to its series')
    }
  }
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
