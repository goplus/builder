import { computed, toRef, toValue, type WatchSource } from 'vue'

import type { ByPage, PaginationParams } from '@/apis/common'
import { listCourses, type Course } from '@/apis/course'
import * as apis from '@/apis/course-series'
import { useAction } from '@/utils/exception'
import { useQueryCache, useQueryWithCache, type QueryMode } from '@/utils/query'

const seriesQueryKeyPrefix = 'course-series'
const seriesCoursesQueryKeyPrefix = 'course-series-courses'

function getSeriesQueryKey(seriesID: string) {
  return [seriesQueryKeyPrefix, seriesID]
}

function getSeriesCoursesQueryKey(seriesID: string | null) {
  return [seriesCoursesQueryKeyPrefix, seriesID]
}

const staleTime = 5 * 60 * 1000

export function useSeries(seriesID: WatchSource<string>, mode: QueryMode = 'background') {
  const seriesIDRef = toRef(seriesID)
  return useQueryWithCache({
    mode,
    queryKey: computed(() => getSeriesQueryKey(seriesIDRef.value)),
    queryFn: (signal) => apis.getCourseSeries(seriesIDRef.value, signal),
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course series', zh: '加载课程系列失败' }
  })
}

export function useSeriesCoursePage(
  seriesID: WatchSource<string | null>,
  pagination: WatchSource<PaginationParams>,
  mode: QueryMode = 'background'
) {
  const seriesIDRef = toRef(seriesID)
  const queryKey = computed(() => [...getSeriesCoursesQueryKey(seriesIDRef.value), toValue(pagination)])
  return useQueryWithCache({
    queryKey,
    mode,
    async queryFn(signal) {
      const id = seriesIDRef.value
      if (id == null) return { data: [], total: 0 }
      return listCourses({ ...toValue(pagination), courseSeriesID: id, orderBy: 'sequenceInCourseSeries' }, signal)
    },
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course list', zh: '加载课程列表失败' }
  })
}

export function useSeriesCourses(seriesID: WatchSource<string | null>, mode: QueryMode = 'background') {
  // Management and navigation currently display at most one API page.
  const page = useSeriesCoursePage(seriesID, () => ({ pageIndex: 1, pageSize: 100 }), mode)
  return { ...page, data: computed(() => page.data.value?.data ?? null) }
}

export function useUpdateCourseSeries() {
  const seriesCache = useQueryCache<apis.CourseSeries>()
  const coursesCache = useQueryCache<ByPage<Course>>()
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
        seriesCache.invalidate(getSeriesQueryKey(courseSeriesID))
        if (params.courseIDs != null) coursesCache.invalidate(getSeriesCoursesQueryKey(courseSeriesID))
        throw e
      }
      seriesCache.invalidateWithOptimisticValue(getSeriesQueryKey(series.id), series)
      // Which courses the series holds, and in what order, may have changed; the new list is not known here.
      if (params.courseIDs != null) coursesCache.invalidate(getSeriesCoursesQueryKey(series.id))
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
  const seriesCache = useQueryCache<apis.CourseSeries>()
  const coursesCache = useQueryCache<ByPage<Course>>()
  return {
    updated(course: Course) {
      coursesCache.invalidateWithOptimisticValue([seriesCoursesQueryKeyPrefix], (page) => ({
        ...page,
        data: page.data.map((c) => (c.id === course.id ? course : c))
      }))
    },
    deleted(courseID: string) {
      // The server takes a deleted course out of every series that held it.
      seriesCache.invalidateWithOptimisticValue([seriesQueryKeyPrefix], (series) => ({
        ...series,
        courseIDs: series.courseIDs.filter((id) => id !== courseID)
      }))
      coursesCache.invalidateWithOptimisticValue([seriesCoursesQueryKeyPrefix], (page) => {
        const data = page.data.filter((c) => c.id !== courseID)
        return { data, total: page.total - (page.data.length - data.length) }
      })
    }
  }
}
