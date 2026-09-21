/**
 * Creating a Playground Course takes two requests the server cannot make one: create the course, then put it in
 * the series it is written for. Either can fail on its own, so the second has to be retryable without redoing the
 * first; otherwise a failed attachment followed by another click on "Create" leaves two courses behind, one of
 * them in no series.
 */

import { DefaultException } from '@/utils/exception'
import { addCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { saveFiles } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import { appendCourseToSeries } from './series'

/** What the author filled in. */
export type PlaygroundCourseCreationParams = {
  title: string
  thumbnail: string
  /** The series the course is written for. */
  courseSeriesID: string
}

/**
 * One attempt at creating a course, kept across retries. It remembers the course once it exists, so running it
 * again only repeats what has not succeeded yet.
 *
 * Consumed by: components/course/management/playground/PlaygroundCourseEditModal.vue (one instance per modal),
 * components/course/management/playground/creation.test.ts.
 */
export class PlaygroundCourseCreation {
  /** The course, once created; null until then. */
  private created: PlaygroundCourse | null = null

  /**
   * @param buildFiles - Builds the records the course starts with. Passed in because the app builds them from the
   *   default project, which fetches template assets, while a test supplies its own.
   */
  constructor(private buildFiles: () => Promise<Files>) {}

  /** The course this attempt has created so far, if any. */
  get createdCourse() {
    return this.created
  }

  /**
   * Create the course unless an earlier run already did, then put it in its series.
   *
   * @param params - What the author filled in. After the course exists, only `courseSeriesID` is still used.
   * @returns The course and the series as it stands with the course in it.
   * @throws Whatever creating the course throws; or a `DefaultException` saying the course exists but is not in
   *   the series yet, which is the case a retry repairs.
   */
  async run(params: PlaygroundCourseCreationParams): Promise<{ course: PlaygroundCourse; courseSeries: CourseSeries }> {
    if (this.created == null) {
      const { fileCollection } = await saveFiles(await this.buildFiles())
      const course = await addCourse({
        kind: 'playground',
        title: params.title,
        thumbnail: params.thumbnail,
        content: fileCollection
      })
      this.created = course as PlaygroundCourse
    }
    const course = this.created
    try {
      const courseSeries = await appendCourseToSeries(params.courseSeriesID, course.id)
      return { course, courseSeries }
    } catch (cause) {
      console.warn('failed to add the new course to its series', cause)
      throw new DefaultException({
        en: `"${course.title}" was created, but adding it to the course series failed. Click "Create" again to retry adding it; no second course will be created.`,
        zh: `"${course.title}"已经创建，但加入课程系列失败。再点一次"创建"只会重试加入，不会再建一门课。`
      })
    }
  }
}
