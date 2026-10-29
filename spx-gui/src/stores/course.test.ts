import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withQueryClient } from '@/utils/test'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useDeleteCourse, useUpdateCourse } from './course'

const apis = vi.hoisted(() => ({ updateCourse: vi.fn(), deleteCourse: vi.fn() }))

vi.mock('@/apis/course', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course')>()),
  ...apis
}))

function page(data: Course[]) {
  return { data, total: data.length }
}

function makeCourse(id: string, title: string) {
  return { id, owner: 'curator', kind: 'playground', title, thumbnail: '', content: {} } as Course
}

function makeSeries(id: string, courseIDs: string[]) {
  return { id, owner: 'curator', kind: 'playground', title: `Series ${id}`, courseIDs } as CourseSeries
}

describe('course writes', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    apis.updateCourse.mockReset()
    apis.deleteCourse.mockReset()
  })

  // A refetch `vue-query` has scheduled for later must not reach into the next test, with its mocks.
  afterEach(() => queryClient.clear())

  it('puts an updated course in the cache, and in every cached course list holding it', async () => {
    const [before, other] = [makeCourse('2338', 'First'), makeCourse('2339', 'Second')]
    const after = makeCourse('2338', 'First, rewritten')
    queryClient.setQueryData(['course', '2338'], before)
    queryClient.setQueryData(
      ['course-series-courses-by-page', '40', { pageIndex: 1, pageSize: 100 }],
      page([before, other])
    )
    queryClient.setQueryData(['course-series-courses-by-page', '41', { pageIndex: 1, pageSize: 100 }], page([before]))
    queryClient.setQueryData(['course-series-courses-by-page', '42', { pageIndex: 1, pageSize: 100 }], page([other]))
    apis.updateCourse.mockResolvedValue(after)
    const updateCourse = withQueryClient(queryClient, () => useUpdateCourse())

    await updateCourse('2338', { title: 'First, rewritten' })

    expect(queryClient.getQueryData(['course', '2338'])).toEqual(after)
    expect(queryClient.getQueryData(['course-series-courses-by-page', '40', { pageIndex: 1, pageSize: 100 }])).toEqual(
      page([after, other])
    )
    expect(queryClient.getQueryData(['course-series-courses-by-page', '41', { pageIndex: 1, pageSize: 100 }])).toEqual(
      page([after])
    )
    expect(queryClient.getQueryData(['course-series-courses-by-page', '42', { pageIndex: 1, pageSize: 100 }])).toEqual(
      page([other])
    )
  })

  it('invalidates a deleted course and its course pages, and updates series membership', async () => {
    const [deleted, kept] = [makeCourse('2338', 'First'), makeCourse('2339', 'Second')]
    queryClient.setQueryData(['course', '2338'], deleted)
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338', '2339']))
    queryClient.setQueryData(['course-series', '41'], makeSeries('41', ['2339']))
    queryClient.setQueryData(
      ['course-series-courses-by-page', '40', { pageIndex: 1, pageSize: 100 }],
      page([deleted, kept])
    )
    apis.deleteCourse.mockResolvedValue(undefined)
    const deleteCourse = withQueryClient(queryClient, () => useDeleteCourse())

    await deleteCourse('2338')

    expect(queryClient.getQueryState(['course', '2338'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData<CourseSeries>(['course-series', '40'])?.courseIDs).toEqual(['2339'])
    expect(queryClient.getQueryData<CourseSeries>(['course-series', '41'])?.courseIDs).toEqual(['2339'])
    expect(
      queryClient.getQueryState(['course-series-courses-by-page', '40', { pageIndex: 1, pageSize: 100 }])?.isInvalidated
    ).toBe(true)
  })

  it('leaves the cache alone when the write fails', async () => {
    const course = makeCourse('2338', 'First')
    queryClient.setQueryData(['course', '2338'], course)
    apis.updateCourse.mockRejectedValue(new Error('network'))
    const updateCourse = withQueryClient(queryClient, () => useUpdateCourse())

    await expect(updateCourse('2338', { title: 'Renamed' })).rejects.toThrow()
    expect(queryClient.getQueryData(['course', '2338'])).toBe(course)
  })
})
