import { DefaultException } from '@/utils/exception'
import { addCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { saveFiles } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import type { UpdateCourseSeries } from '@/stores/course-series'
import { appendCourseToSeries } from './series'

export type PlaygroundCourseCreationParams = {
  title: string
  thumbnail: string
  courseSeriesID: string
}

/**
 * One attempt at creating a Playground Course, kept across retries. Creating the course and adding it to its series
 * are two requests that can fail separately; once the course exists, running again only retries adding it, so a
 * failed add followed by another "Create" does not leave a second course behind.
 */
export class PlaygroundCourseCreation {
  private created: PlaygroundCourse | null = null

  constructor(
    /** Builds the files the course starts with. */
    private buildFiles: () => Promise<Files>,
    private updateCourseSeries: UpdateCourseSeries
  ) {}

  get createdCourse() {
    return this.created
  }

  /** Create the course unless an earlier run already did, then put it in its series. */
  async run(
    /** Once the course exists, only `courseSeriesID` is used. */
    params: PlaygroundCourseCreationParams
  ): Promise<{ course: PlaygroundCourse; courseSeries: CourseSeries }> {
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
      const courseSeries = await appendCourseToSeries(params.courseSeriesID, course.id, this.updateCourseSeries)
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
