import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey } from 'vue'

import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { getCourse, type Course, type CourseKind } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'

import type { GuidedTutorial } from './guided/guided-tutorial'
type GuidedTutorialController = Pick<GuidedTutorial, 'startCourse' | 'endCurrentCourse'>
type TutorialRouter = Pick<Router, 'push'> & {
  readonly currentRoute: Readonly<Ref<Pick<RouteLocationNormalizedLoaded, 'matched' | 'params'>>>
}

const playgroundRoutePath = '/course/:courseSeriesIdInput/:courseIdInput/playground/:inEditorPath*'

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

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

export function useTutorial() {
  const tutorial = inject(tutorialKey)
  if (tutorial == null) throw new Error('Tutorial not provided')
  return tutorial
}

export function provideTutorial(tutorial: Tutorial) {
  provide(tutorialKey, tutorial)
}

export class Tutorial {
  private currentCourseRef = shallowRef<TutorialCourseStatus | null>(null)

  constructor(
    private guidedTutorial: GuidedTutorialController,
    private router: TutorialRouter,
    private loadCourse: (id: string) => Promise<Course> = getCourse,
    private loadCourseSeries: (id: string) => Promise<CourseSeries> = getCourseSeries
  ) {}

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

  async startCourse(courseSeriesID: string, courseID: string): Promise<void> {
    this.guidedTutorial.endCurrentCourse()
    const [series, course] = await Promise.all([this.loadCourseSeries(courseSeriesID), this.loadCourse(courseID)])
    if (!series.courseIDs.includes(course.id)) throw new Error(`course ${course.id} is not in series ${series.id}`)

    if (course.kind === 'guided') {
      await this.guidedTutorial.startCourse(course, series)
      return
    }

    await this.router.push(`/course/${encodeURIComponent(series.id)}/${encodeURIComponent(course.id)}/playground`)
  }

  async endCurrentCourse(): Promise<void> {
    this.guidedTutorial.endCurrentCourse()

    const route = this.router.currentRoute.value
    if (!route.matched.some((record) => record.path === playgroundRoutePath)) return

    const courseSeriesID = route.params.courseSeriesIdInput
    if (typeof courseSeriesID !== 'string') return
    await this.router.push(`/course-series/${encodeURIComponent(courseSeriesID)}`)
  }
}
