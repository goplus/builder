import { ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import type { GuidedCourse, PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

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

function makeControllers(
  route: Pick<RouteLocationNormalizedLoaded, 'matched' | 'params'> = { matched: [], params: {} }
) {
  return {
    guided: {
      startCourse: vi.fn().mockResolvedValue(undefined),
      endCurrentCourse: vi.fn()
    },
    router: { currentRoute: ref(route), push: vi.fn().mockResolvedValue(undefined) }
  }
}

describe('Tutorial', () => {
  it('loads IDs and delegates Guided Course startup', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const loadCourse = vi.fn().mockResolvedValue(course)
    const loadSeries = vi.fn().mockResolvedValue(series)
    const tutorial = new Tutorial(guided, router, loadCourse, loadSeries)

    await tutorial.startCourse(series.id, course.id)

    expect(loadCourse).toHaveBeenCalledWith(course.id)
    expect(loadSeries).toHaveBeenCalledWith(series.id)
    expect(guided.startCourse).toHaveBeenCalledWith(course, series)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('navigates to the Playground route', async () => {
    const course = makePlaygroundCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router, vi.fn().mockResolvedValue(course), vi.fn().mockResolvedValue(series))

    await tutorial.startCourse(series.id, course.id)

    expect(router.push).toHaveBeenCalledWith('/course/series-1/course-1/playground')
    expect(guided.startCourse).not.toHaveBeenCalled()
  })

  it('ends Guided Course before starting another Course', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries()
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router, vi.fn().mockResolvedValue(course), vi.fn().mockResolvedValue(series))

    await tutorial.startCourse(series.id, course.id)

    expect(guided.endCurrentCourse).toHaveBeenCalledOnce()
    expect(guided.endCurrentCourse.mock.invocationCallOrder[0]).toBeLessThan(
      guided.startCourse.mock.invocationCallOrder[0]
    )
  })

  it('exits an active Playground Course to its Course Series', async () => {
    const series = makeSeries()
    const { guided, router } = makeControllers({
      matched: [
        {
          path: '/course/:courseSeriesIdInput/:courseIdInput/playground/:inEditorPath*'
        } as RouteLocationNormalizedLoaded['matched'][number]
      ],
      params: { courseSeriesIdInput: series.id, courseIdInput: 'course-1' }
    })
    const tutorial = new Tutorial(guided, router)

    await tutorial.endCurrentCourse()

    expect(guided.endCurrentCourse).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith('/course-series/series-1')
  })

  it('rejects a Course outside the requested Series', async () => {
    const course = makeGuidedCourse()
    const series = makeSeries(['another-course'])
    const { guided, router } = makeControllers()
    const tutorial = new Tutorial(guided, router, vi.fn().mockResolvedValue(course), vi.fn().mockResolvedValue(series))

    await expect(tutorial.startCourse(series.id, course.id)).rejects.toThrow(
      `course ${course.id} is not in series ${series.id}`
    )
    expect(guided.startCourse).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })
})
