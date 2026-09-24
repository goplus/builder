import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey } from 'vue'

import type { Course, CourseKind } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

export type TutorialCourseStatus = {
  courseID: string
  courseKind: CourseKind
  courseTitle: string
  seriesID: string
  seriesTitle: string
  seriesCourseIDs: string[]
  seriesCourses: TutorialCoursePreview[] | null
  courseIndex: number | null
  courseCount: number
  state: 'in-progress' | 'completed'
}

export type TutorialCoursePreview = Pick<Course, 'id' | 'title' | 'thumbnail'>

const tutorialStatusKey: InjectionKey<TutorialStatus> = Symbol('tutorial-status')

export function useTutorialStatus() {
  const status = inject(tutorialStatusKey)
  if (status == null) throw new Error('Tutorial status not provided')
  return status
}

export function provideTutorialStatus(status: TutorialStatus) {
  provide(tutorialStatusKey, status)
}

export class TutorialStatus {
  private currentCourseRef = shallowRef<TutorialCourseStatus | null>(null)

  get currentCourse() {
    return this.currentCourseRef.value
  }

  setCurrentCourse(course: Course, series: CourseSeries, seriesCourses?: Course[]) {
    const courseIndex = series.courseIDs.indexOf(course.id)
    this.currentCourseRef.value = {
      courseID: course.id,
      courseKind: course.kind,
      courseTitle: course.title,
      seriesID: series.id,
      seriesTitle: series.title,
      seriesCourseIDs: [...series.courseIDs],
      seriesCourses: seriesCourses?.map(({ id, title, thumbnail }) => ({ id, title, thumbnail })) ?? null,
      courseIndex: courseIndex < 0 ? null : courseIndex + 1,
      courseCount: series.courseIDs.length,
      state: 'in-progress'
    }
  }

  markCurrentCourseCompleted(courseKind: CourseKind, courseID: string) {
    const currentCourse = this.currentCourseRef.value
    if (currentCourse == null || currentCourse.courseKind !== courseKind || currentCourse.courseID !== courseID) return
    this.currentCourseRef.value = { ...currentCourse, state: 'completed' }
  }

  clearCurrentCourse(courseKind: CourseKind, courseID: string) {
    const currentCourse = this.currentCourseRef.value
    if (currentCourse == null || currentCourse.courseKind !== courseKind || currentCourse.courseID !== courseID) return
    this.currentCourseRef.value = null
  }

  clearCourseKind(courseKind: CourseKind) {
    if (this.currentCourseRef.value?.courseKind === courseKind) this.currentCourseRef.value = null
  }
}
