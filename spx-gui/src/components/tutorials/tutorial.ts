import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey } from 'vue'

import type { Router } from 'vue-router'

import { getCourse, type Course, type PlaygroundCourse } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import { getCoursePlaygroundRoute, getCourseSeriesPageRoute } from '@/apps/xbuilder/router'

import type { GuidedTutorial } from './guided/guided-tutorial'
type GuidedTutorialController = Pick<GuidedTutorial, 'currentCourse' | 'startCourse' | 'endCurrentCourse'>
type TutorialRouter = Pick<Router, 'push' | 'go'>

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
    private router: TutorialRouter,
    private loadCourse: (id: string) => Promise<Course> = getCourse,
    private loadCourseSeries: (id: string) => Promise<CourseSeries> = getCourseSeries
  ) {}

  get currentCourse(): CurrentCourse | null {
    const currentPlaygroundCourse = this.currentPlaygroundCourseRef.value
    if (currentPlaygroundCourse != null) return currentPlaygroundCourse
    const currentGuidedCourse = this.guidedTutorial.currentCourse
    return currentGuidedCourse == null ? null : { ...currentGuidedCourse, state: CourseState.InProgress }
  }

  /** Starts a course by ID. Starting the current course again restarts it. */
  async startCourse(courseSeriesID: string, courseID: string): Promise<void> {
    this.guidedTutorial.endCurrentCourse()
    // const currentPlaygroundCourse = this.currentPlaygroundCourseRef.value
    // if (
    //   currentPlaygroundCourse != null &&
    //   currentPlaygroundCourse.id === courseID &&
    //   currentPlaygroundCourse.series.id === courseSeriesID
    // ) {
    //   // Vue Router ignores a push to the current route; reload to recreate the Playground project and runner.
    //   this.router.go(0)
    //   return
    // }

    const [series, course] = await Promise.all([this.loadCourseSeries(courseSeriesID), this.loadCourse(courseID)])
    if (!series.courseIDs.includes(course.id)) throw new Error(`course ${course.id} is not in series ${series.id}`)

    if (course.kind === 'guided') {
      await this.guidedTutorial.startCourse(course, series)
      return
    }

    await this.router.push({
      path: getCoursePlaygroundRoute(series.id, course.id),
      force: true // Force reload even if the route is the same, to recreate the Playground project and runner.
    })
  }

  async endCurrentCourse(): Promise<void> {
    const currentCourse = this.currentCourse
    if (currentCourse == null) return
    if (currentCourse.kind === 'guided') {
      this.guidedTutorial.endCurrentCourse()
      return
    }
    await this.router.push(getCourseSeriesPageRoute(currentCourse.series.id))
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
