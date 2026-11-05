import { flushPromises } from '@vue/test-utils'
import { QueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QueryMode } from '@/utils/query'
import { withQueryClient } from '@/utils/test'
import type { Course } from '@/apis/course'
import { client } from '@/apis/common'
import type { CourseSeries } from '@/apis/course-series'
import {
  useCourseChangesInSeries,
  useDeleteCourseSeries,
  useSeries,
  useSeriesCourses,
  useUpdateCourseSeries
} from './course-series'

const apis = vi.hoisted(() => ({
  getCourseSeries: vi.fn(),
  listCourses: vi.fn(),
  updateCourseSeries: vi.fn(),
  deleteCourseSeries: vi.fn()
}))

vi.mock('@/apis/course', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course')>()),
  listCourses: apis.listCourses
}))
vi.mock('@/apis/course-series', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course-series')>()),
  getCourseSeries: apis.getCourseSeries,
  updateCourseSeries: apis.updateCourseSeries,
  deleteCourseSeries: apis.deleteCourseSeries
}))

function page(data: Course[]) {
  return { data, total: data.length }
}

function makeCourse(id: string) {
  return { id, owner: 'curator', kind: 'playground', title: `Course ${id}`, thumbnail: '', content: {} } as Course
}

function makeSeries(id: string, courseIDs: string[]) {
  return {
    id,
    owner: 'curator',
    kind: 'playground',
    title: `Series ${id}`,
    courseIDs,
    units: [] as CourseSeries['units']
  } as CourseSeries
}

describe('course series writes', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    apis.listCourses.mockReset()
    apis.getCourseSeries.mockReset()
    vi.spyOn(client, 'get').mockImplementation((_path, params, options) => apis.listCourses(params, options?.signal))
    apis.updateCourseSeries.mockReset()
    apis.deleteCourseSeries.mockReset()
  })

  // A refetch `vue-query` has scheduled for later must not reach into the next test, with its mocks.
  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it('reads the selected series and clears it without a request when its ID becomes null', async () => {
    const id = ref<string | null>('40')
    apis.getCourseSeries.mockResolvedValue(makeSeries('40', ['2338']))
    const series = withQueryClient(queryClient, () => useSeries(id))
    await flushPromises()
    expect(series.data.value?.id).toBe('40')
    id.value = null
    await flushPromises()
    expect(series.data.value).toBeNull()
    expect(series.error.value).toBeNull()
    expect(series.isLoading.value).toBe(false)
    expect(apis.getCourseSeries).toHaveBeenCalledOnce()
  })

  it('publishes the saved series and makes a snapshot reader wait for the invalidated list', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    const after = makeSeries('40', ['2338', '2340'])
    apis.updateCourseSeries.mockResolvedValue(after)
    const updateCourseSeries = withQueryClient(queryClient, () => useUpdateCourseSeries())

    await updateCourseSeries('40', { courseIDs: ['2338', '2340'] })

    expect(queryClient.getQueryData(['course-series', '40'])).toEqual(after)
    expect(queryClient.getQueryState(['course-series', '40'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['course-series-courses', '40'])?.isInvalidated).toBe(true)
    apis.listCourses.mockResolvedValue({ total: 2, data: [makeCourse('2338'), makeCourse('2340')] })
    const courses = withQueryClient(queryClient, () => useSeriesCourses(() => '40', { mode: QueryMode.Snapshot }))
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

    // Background readers keep the current list until the refresh succeeds.
    expect(courses.isLoading.value).toBe(false)
    expect(courses.data.value).toEqual([makeCourse('2338')])
    resolveFresh({ total: 2, data: [makeCourse('2338'), makeCourse('2340')] })
    await vi.waitFor(() => expect(courses.data.value).toEqual([makeCourse('2338'), makeCourse('2340')]))
  })

  it('invalidates both series and list when changing units', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    const units = [{ id: 'unit', title: 'Basics', courseIDs: ['2340', '2338'] }]
    const saved = { ...makeSeries('40', ['2340', '2338']), units }
    apis.updateCourseSeries.mockResolvedValue(saved)
    const update = withQueryClient(queryClient, () => useUpdateCourseSeries())

    await update('40', { units })

    expect(queryClient.getQueryData(['course-series', '40'])).toEqual(saved)
    expect(queryClient.getQueryState(['course-series', '40'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['course-series-courses', '40'])?.isInvalidated).toBe(true)
  })

  it('invalidates a series and list after an uncertain write failure', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    apis.updateCourseSeries.mockRejectedValue(new Error('timeout'))
    const updateCourseSeries = withQueryClient(queryClient, () => useUpdateCourseSeries())

    await expect(updateCourseSeries('40', { courseIDs: ['2340'] })).rejects.toThrow()

    expect(queryClient.getQueryState(['course-series', '40'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['course-series-courses', '40'])?.isInvalidated).toBe(true)
  })

  it('invalidates a deleted series and its course list', async () => {
    queryClient.setQueryData(['course-series', '40'], makeSeries('40', ['2338']))
    queryClient.setQueryData(['course-series-courses', '40'], [makeCourse('2338')])
    apis.deleteCourseSeries.mockResolvedValue(undefined)
    const deleteCourseSeries = withQueryClient(queryClient, () => useDeleteCourseSeries())

    await deleteCourseSeries('40')

    expect(queryClient.getQueryState(['course-series', '40'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['course-series-courses', '40'])?.isInvalidated).toBe(true)
  })

  it('refreshes the shared complete list after a course is deleted', async () => {
    let courses = ['1', '2', '3', '4'].map(makeCourse)
    apis.listCourses.mockImplementation(async () => page(courses))
    const list = withQueryClient(queryClient, () => useSeriesCourses(() => '40'))
    await flushPromises()
    expect(list.data.value).toEqual(courses)

    const changes = withQueryClient(queryClient, () => useCourseChangesInSeries())
    courses = courses.slice(1)
    changes.deleted('1')

    await vi.waitFor(() => expect(list.data.value).toEqual(courses))
  })
})
