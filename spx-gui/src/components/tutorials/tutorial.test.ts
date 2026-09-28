import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import type { GuidedCourse, PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { Cancelled } from '@/utils/exception'

import type { CurrentCourse as GuidedCurrentCourse } from './guided/guided-tutorial'
import { Tutorial } from './tutorial'

function makeSeries(courseIDs = ['course-1']): CourseSeries {
  return {
    id: 'series-1',
    owner: 'owner',
    kind: 'guided',
    title: 'Series',
    thumbnail: '',
    description: '',
    courseIDs,
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
}

function makeGuidedCourse(): GuidedCourse {
  return {
    id: 'course-1',
    owner: 'owner',
    kind: 'guided',
    title: 'Guided',
    thumbnail: '',
    content: { entrypoint: '/tutorials', prompt: 'Learn Builder' }
  }
}

function makePlaygroundCourse(): PlaygroundCourse {
  return {
    id: 'course-1',
    owner: 'owner',
    kind: 'playground',
    title: 'Playground',
    thumbnail: '',
    content: {}
  }
}

function makeControllers() {
  return {
    guided: {
      currentCourse: null as GuidedCurrentCourse | null,
      enterCourse: vi.fn().mockResolvedValue(undefined),
      endCurrentCourse: vi.fn()
    },
    router: { push: vi.fn().mockResolvedValue(undefined), replace: vi.fn().mockResolvedValue(undefined) }
  }
}

describe('Tutorial', () => {
  it('opens the Start page without entering the course', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)

    await tutorial.startCourse(series.id, course.id)

    expect(router.push).toHaveBeenCalledWith('/course/series-1/course-1/start')
    expect(guided.enterCourse).not.toHaveBeenCalled()
    expect(guided.endCurrentCourse).not.toHaveBeenCalled()
  })

  it('replaces the Start route when restarting the current course', async () => {
    const course = makePlaygroundCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)
    tutorial.notifyPlaygroundCourseStarted(course, series)

    await tutorial.startCourse(series.id, course.id)

    expect(router.replace).toHaveBeenCalledWith('/course/series-1/course-1/start')
    expect(router.push).not.toHaveBeenCalled()
    expect(tutorial.currentCourse?.id).toBe(course.id)
  })

  it('replaces the Start route when restarting a Guided Course', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    guided.currentCourse = { ...course, series }
    const tutorial = new Tutorial(guided, router)

    await tutorial.startCourse(series.id, course.id)

    expect(router.replace).toHaveBeenCalledWith('/course/series-1/course-1/start')
    expect(guided.endCurrentCourse).not.toHaveBeenCalled()
  })

  it('enters a Guided Course from the Start page', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)

    await tutorial.enterCourse(course, series)

    expect(guided.enterCourse).toHaveBeenCalledWith(course, series)
    expect(guided.endCurrentCourse).toHaveBeenCalledOnce()
    expect(guided.endCurrentCourse.mock.invocationCallOrder[0]).toBeLessThan(
      guided.enterCourse.mock.invocationCallOrder[0]
    )
  })

  it('enters a Playground Course and replaces the Start page', async () => {
    const course = makePlaygroundCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)

    await tutorial.enterCourse(course, series)

    expect(router.replace).toHaveBeenCalledWith('/course/series-1/course-1/playground')
    expect(guided.enterCourse).not.toHaveBeenCalled()
  })

  it('reports a cancelled navigation without ending the current course', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {} },
        { path: '/course/:series/:course/start', component: {} }
      ]
    })
    await router.push('/')
    router.beforeEach(() => false)
    const { guided } = makeControllers()
    const tutorial = new Tutorial(guided, router)

    await expect(tutorial.startCourse('series-1', 'course-1')).rejects.toBeInstanceOf(Cancelled)
    expect(guided.endCurrentCourse).not.toHaveBeenCalled()
  })

  it('exits an active Playground Course to its Course Series', async () => {
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)
    tutorial.notifyPlaygroundCourseStarted(makePlaygroundCourse(), series)

    await tutorial.endCurrentCourse()

    expect(guided.endCurrentCourse).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/course-series/series-1')
  })

  it('rejects a Course outside the requested Series', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries(['another-course'])
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router)

    await expect(tutorial.enterCourse(course, series)).rejects.toThrow(
      `course ${course.id} is not in series ${series.id}`
    )
    expect(guided.enterCourse).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
