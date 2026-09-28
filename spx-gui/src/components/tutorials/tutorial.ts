import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey } from 'vue'

import { isNavigationFailure, type Router } from 'vue-router'

import type { Course, PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { getCoursePlaygroundRoute, getCourseSeriesPageRoute, getCourseStartRoute } from '@/apps/xbuilder/router'
import { Cancelled } from '@/utils/exception'

import type { GuidedTutorial } from './guided/guided-tutorial'
type GuidedTutorialController = Pick<GuidedTutorial, 'currentCourse' | 'enterCourse' | 'endCurrentCourse'>
type TutorialRouter = Pick<Router, 'push' | 'replace'>

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

export enum CourseState {
  InProgress = 'in-progress',
  Completed = 'completed'
}

export type CurrentCourse = Course & {
  series: CourseSeries
  state: CourseState
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
  private currentPlaygroundCourseRef = shallowRef<CurrentCourse | null>(null)

  constructor(
    private guidedTutorial: GuidedTutorialController,
    private router: TutorialRouter
  ) {}

  get currentCourse(): CurrentCourse | null {
    const currentPlaygroundCourse = this.currentPlaygroundCourseRef.value
    if (currentPlaygroundCourse != null) return currentPlaygroundCourse
    const currentGuidedCourse = this.guidedTutorial.currentCourse
    return currentGuidedCourse == null ? null : { ...currentGuidedCourse, state: CourseState.InProgress }
  }

  /** URL of the Start page used by course links and startCourse. */
  getCourseStartRoute(courseSeriesID: string, courseID: string): string {
    return getCourseStartRoute(courseSeriesID, courseID)
  }

  /**
   * Navigates to the Start page, which then calls enterCourse to load and enter the course.
   * Restarting the current course replaces its history entry. If leaving the current page is blocked,
   * this throws Cancelled and leaves the current course running.
   */
  async startCourse(courseSeriesID: string, courseID: string): Promise<void> {
    const currentCourse = this.currentCourse
    const restart = currentCourse?.id === courseID && currentCourse.series.id === courseSeriesID
    const route = this.getCourseStartRoute(courseSeriesID, courseID)
    const failure = await (restart ? this.router.replace(route) : this.router.push(route))
    if (isNavigationFailure(failure)) throw new Cancelled(failure)
  }

  /**
   * Called by the Start page after it loads the course and series. Validates their relationship and
   * replaces the Start page with the course destination. Startup failures remain there for retry.
   */
  async enterCourse(course: Course, series: CourseSeries): Promise<void> {
    if (!series.courseIDs.includes(course.id)) throw new Error(`course ${course.id} is not in series ${series.id}`)

    this.guidedTutorial.endCurrentCourse()

    if (course.kind === 'guided') {
      await this.guidedTutorial.enterCourse(course, series)
    } else if (course.kind === 'playground') {
      const failure = await this.router.replace(getCoursePlaygroundRoute(series.id, course.id))
      if (isNavigationFailure(failure)) throw failure
    }
  }

  async endCurrentCourse(): Promise<void> {
    const currentCourse = this.currentCourse
    if (currentCourse == null) return
    if (currentCourse.kind === 'guided') {
      this.guidedTutorial.endCurrentCourse()
    } else if (currentCourse.kind === 'playground') {
      await this.router.push(getCourseSeriesPageRoute(currentCourse.series.id))
    }
  }

  notifyPlaygroundCourseStarted(course: PlaygroundCourse, series: CourseSeries) {
    this.currentPlaygroundCourseRef.value = { ...course, series, state: CourseState.InProgress }
  }

  notifyPlaygroundCourseCompleted(courseID: string) {
    const currentPlaygroundCourse = this.currentPlaygroundCourseRef.value
    if (currentPlaygroundCourse == null || currentPlaygroundCourse.id !== courseID) return
    this.currentPlaygroundCourseRef.value = { ...currentPlaygroundCourse, state: CourseState.Completed }
  }

  notifyPlaygroundCourseEnded(courseID: string) {
    const currentPlaygroundCourse = this.currentPlaygroundCourseRef.value
    if (currentPlaygroundCourse == null || currentPlaygroundCourse.id !== courseID) return
    this.currentPlaygroundCourseRef.value = null
  }
}
