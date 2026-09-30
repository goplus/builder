import { flushPromises } from '@vue/test-utils'
import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withQueryClient } from '@/utils/test'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useDeleteCourseSeries, useSeriesCourses, useUpdateCourseSeries } from './course-series'

const apis = vi.hoisted(() => ({ listCourses: vi.fn(), updateCourseSeries: vi.fn(), deleteCourseSeries: vi.fn() }))

vi.mock('@/apis/course', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course')>()),
  listCourses: apis.listCourses
}))
vi.mock('@/apis/course-series', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course-series')>()),
  updateCourseSeries: apis.updateCourseSeries,
  deleteCourseSeries: apis.deleteCourseSeries
}))

function makeCourse(id: string) {
  return { id, owner: 'curator', kind: 'playground', title: `Course ${id}`, thumbnail: '', content: {} } as Course
}

function makeSeries(id: string, courseIDs: string[]) {
  return { id, owner: 'curator', kind: 'playground', title: `Series ${id}`, courseIDs } as CourseSeries
}

describe('course series writes', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    apis.listCourses.mockReset()
    apis.updateCourseSeries.mockReset()
    apis.deleteCourseSeries.mockReset()
  })

  // A refetch `vue-query` has scheduled for later must not reach into the next test, with its mocks.
  afterEach(() => queryClient.clear())

  it('puts an updated series in the cache, and drops its course list for the next reader to fetch', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    queryClient.setQueryData(['course-series-courses', '41'], [makeCourse('2339')])
    const after = makeSeries('40', ['2338', '2340'])
    apis.updateCourseSeries.mockResolvedValue(after)
    const updateCourseSeries = withQueryClient(queryClient, () => useUpdateCourseSeries())

    await updateCourseSeries('40', { courseIDs: ['2338', '2340'] })

    expect(queryClient.getQueryData(['course-series', '40'])).toEqual(after)
    expect(queryClient.getQueryData(['course-series-courses', '40'])).toBeUndefined()
    expect(queryClient.getQueryData(['course-series-courses', '41'])).toEqual([makeCourse('2339')])
    // Starting a lesson of the series now waits for its list as it is, instead of taking the old one.
    apis.listCourses.mockResolvedValue({ total: 2, data: [makeCourse('2338'), makeCourse('2340')] })
    const courses = withQueryClient(queryClient, () => useSeriesCourses(() => '40'))
    expect(courses.isLoading.value).toBe(true)
    await flushPromises()
    expect(courses.data.value).toEqual([makeCourse('2338'), makeCourse('2340')])
  })

  it('refreshes the course list of a series a page is showing, which keeps it until the fresh one arrives', async () => {
    let resolveFresh!: (value: unknown) => void
    apis.listCourses
      .mockResolvedValueOnce({ total: 1, data: [makeCourse('2338')] })
      .mockReturnValueOnce(new Promise((resolve) => (resolveFresh = resolve)))
    const courses = withQueryClient(queryClient, () => useSeriesCourses(() => '40'))
    await flushPromises()
    apis.updateCourseSeries.mockResolvedValue(makeSeries('40', ['2338', '2340']))
    const updateCourseSeries = withQueryClient(queryClient, () => useUpdateCourseSeries())

    await updateCourseSeries('40', { courseIDs: ['2338', '2340'] })
    await vi.waitFor(() => expect(apis.listCourses).toHaveBeenCalledTimes(2))

    // A lesson running on the list is not reset by the refresh.
    expect(courses.isLoading.value).toBe(false)
    expect(courses.data.value).toEqual([makeCourse('2338')])
    resolveFresh({ total: 2, data: [makeCourse('2338'), makeCourse('2340')] })
    await vi.waitFor(() => expect(courses.data.value).toEqual([makeCourse('2338'), makeCourse('2340')]))
  })

  it('drops a deleted series and its course list', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    apis.deleteCourseSeries.mockResolvedValue(undefined)
    const deleteCourseSeries = withQueryClient(queryClient, () => useDeleteCourseSeries())

    await deleteCourseSeries('40')

    expect(queryClient.getQueryData(['course-series', '40'])).toBeUndefined()
    expect(queryClient.getQueryData(['course-series-courses', '40'])).toBeUndefined()
  })
})
