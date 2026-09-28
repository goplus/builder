import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey } from 'vue'

import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { getCourse, type Course, type CourseKind } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'

import type { GuidedTutorial } from './guided/guided-tutorial'
type GuidedTutorialController = Pick<GuidedTutorial, 'current' | 'startCourse' | 'endCurrentCourse'>
type TutorialRouter = Pick<Router, 'push'> & {
  readonly currentRoute: Readonly<Ref<Pick<RouteLocationNormalizedLoaded, 'matched' | 'params'>>>
}

const playgroundRoutePath = '/course/:courseSeriesIdInput/:courseIdInput/playground/:inEditorPath*'

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

export type TutorialSession = {
  course: Course
  series: CourseSeries
  seriesCourses?: Course[] | null
  courseState?: 'in-progress' | 'completed'
}

export function useTutorial() {
  const tutorial = inject(tutorialKey)
  if (tutorial == null) throw new Error('Tutorial not provided')
  return tutorial
}

export function provideTutorial(tutorial: Tutorial) {
  provide(tutorialKey, tutorial)
}

export class Tutorial {
  private playgroundCurrentRef = shallowRef<TutorialSession | null>(null)

  constructor(
    private guidedTutorial: GuidedTutorialController,
    private router: TutorialRouter,
    private loadCourse: (id: string) => Promise<Course> = getCourse,
    private loadCourseSeries: (id: string) => Promise<CourseSeries> = getCourseSeries
  ) {}

  get current(): TutorialSession | null {
    return this.guidedTutorial.current ?? this.playgroundCurrentRef.value
  }

  setCurrentCourse(course: Course, series: CourseSeries, seriesCourses?: Course[]) {
    this.playgroundCurrentRef.value = {
      course,
      series,
      seriesCourses: seriesCourses ?? null,
      courseState: 'in-progress'
    }
  }

  markCurrentCourseCompleted(courseKind: CourseKind, courseID: string) {
    const playgroundCurrent = this.playgroundCurrentRef.value
    if (
      playgroundCurrent == null ||
      playgroundCurrent.course.kind !== courseKind ||
      playgroundCurrent.course.id !== courseID
    )
      return
    this.playgroundCurrentRef.value = { ...playgroundCurrent, courseState: 'completed' }
  }

  clearCurrentCourse(courseKind: CourseKind, courseID: string) {
    const playgroundCurrent = this.playgroundCurrentRef.value
    if (
      playgroundCurrent == null ||
      playgroundCurrent.course.kind !== courseKind ||
      playgroundCurrent.course.id !== courseID
    )
      return
    this.playgroundCurrentRef.value = null
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
