import { computed, toRef, toValue, type WatchSource } from 'vue'

import type { ByPage, PaginationParams } from '@/apis/common'
import { listCourses, type Course } from '@/apis/course'
import * as apis from '@/apis/course-series'
import { useAction } from '@/utils/exception'
import { useQueryCache, useQueryWithCache, type QueryMode } from '@/utils/query'

const seriesQueryKeyPrefix = 'course-series'
const seriesCoursesQueryKeyPrefix = 'course-series-courses-by-page'

function getSeriesQueryKey(seriesID: string) {
  return [seriesQueryKeyPrefix, seriesID]
}

function getSeriesCoursesQueryKey(seriesID: string | null) {
  return [seriesCoursesQueryKeyPrefix, seriesID]
}

const staleTime = 5 * 60 * 1000

export function useSeries(seriesID: WatchSource<string>, options: { mode?: QueryMode } = {}) {
  const seriesIDRef = toRef(seriesID)
  return useQueryWithCache({
    mode: options.mode,
    queryKey: computed(() => getSeriesQueryKey(seriesIDRef.value)),
    queryFn: (signal) => apis.getCourseSeries(seriesIDRef.value, signal),
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course series', zh: '加载课程系列失败' }
  })
}

export function useSeriesCoursesByPage(
  seriesID: WatchSource<string | null>,
  pagination: WatchSource<PaginationParams>,
  options: { mode?: QueryMode } = {}
) {
  const seriesIDRef = toRef(seriesID)
  const queryKey = computed(() => [...getSeriesCoursesQueryKey(seriesIDRef.value), toValue(pagination)])
  return useQueryWithCache({
    queryKey,
    mode: options.mode,
    async queryFn(signal) {
      const id = seriesIDRef.value
      if (id == null) return { data: [], total: 0 }
      return listCourses({ ...toValue(pagination), courseSeriesID: id, orderBy: 'sequenceInCourseSeries' }, signal)
    },
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course list', zh: '加载课程列表失败' }
  })
}

export function useSeriesCourses(seriesID: WatchSource<string | null>, options: { mode?: QueryMode } = {}) {
  // Management and navigation currently display at most one API page.
  const page = useSeriesCoursesByPage(seriesID, () => ({ pageIndex: 1, pageSize: 100 }), options)
  return { ...page, data: computed(() => page.data.value?.data ?? null) }
}

export function useUpdateCourseSeries() {
  const queryCache = useQueryCache()
  return useAction(
    async function updateCourseSeries(
      courseSeriesID: string,
      params: apis.UpdateCourseSeriesParams,
      signal?: AbortSignal
    ) {
      let series: apis.CourseSeries
      try {
        series = await apis.updateCourseSeries(courseSeriesID, params, signal)
      } catch (e) {
        // A failed update may still have taken effect, its answer lost, so what is cached is no longer known.
        queryCache.invalidate(getSeriesQueryKey(courseSeriesID))
        if (params.courseIDs != null) queryCache.invalidate(getSeriesCoursesQueryKey(courseSeriesID))
        throw e
      }
      queryCache.invalidateWithOptimisticValue(getSeriesQueryKey(series.id), series)
      // Which courses the series holds, and in what order, may have changed; the new list is not known here.
      if (params.courseIDs != null) queryCache.invalidate(getSeriesCoursesQueryKey(series.id))
      return series
    },
    { en: 'Failed to update course series', zh: '更新课程系列失败' }
  )
}

export type UpdateCourseSeries = ReturnType<typeof useUpdateCourseSeries>

export function useDeleteCourseSeries() {
  const queryCache = useQueryCache()
  return useAction(
    async function deleteCourseSeries(courseSeriesID: string) {
      await apis.deleteCourseSeries(courseSeriesID)
      queryCache.invalidate(getSeriesQueryKey(courseSeriesID))
      queryCache.invalidate(getSeriesCoursesQueryKey(courseSeriesID))
    },
    { en: 'Failed to delete course series', zh: '删除课程系列失败' }
  )
}

export type DeleteCourseSeries = ReturnType<typeof useDeleteCourseSeries>

/** Keeps cached series and their course lists in step with writes to courses. */
export function useCourseChangesInSeries() {
  const queryCache = useQueryCache()
  return {
    updated(course: Course) {
      queryCache.invalidateMatchingWithOptimisticUpdater<ByPage<Course>>([seriesCoursesQueryKeyPrefix], (page) => ({
        ...page,
        data: page.data.map((c) => (c.id === course.id ? course : c))
      }))
    },
    deleted(courseID: string) {
      // The server takes a deleted course out of every series that held it.
      queryCache.invalidateMatchingWithOptimisticUpdater<apis.CourseSeries>([seriesQueryKeyPrefix], (series) => ({
        ...series,
        courseIDs: series.courseIDs.filter((id) => id !== courseID)
      }))
      // Deletion shifts page boundaries; let the server refill pages and recalculate totals.
      queryCache.invalidate([seriesCoursesQueryKeyPrefix])
    }
  }
}
