import { computed, toRef, type WatchSource } from 'vue'

import { listCourses, type Course } from '@/apis/course'
import * as apis from '@/apis/course-series'
import { useAction } from '@/utils/exception'
import { useQueryCache, useQueryWithCache } from '@/utils/query'

const seriesQueryKeyPrefix = 'course-series'
const seriesCoursesQueryKeyPrefix = 'course-series-courses'

function getSeriesQueryKey(seriesID: string) {
  return [seriesQueryKeyPrefix, seriesID]
}

function getSeriesCoursesQueryKey(seriesID: string | null) {
  return [seriesCoursesQueryKeyPrefix, seriesID]
}

const staleTime = 5 * 60 * 1000

export function useSeries(seriesID: WatchSource<string>) {
  const seriesIDRef = toRef(seriesID)
  return useQueryWithCache({
    queryKey: computed(() => getSeriesQueryKey(seriesIDRef.value)),
    queryFn: (signal) => apis.getCourseSeries(seriesIDRef.value, signal),
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course series', zh: '加载课程系列失败' }
  })
}

export function useSeriesCourses(seriesID: WatchSource<string | null>) {
  const seriesIDRef = toRef(seriesID)
  const queryKey = computed(() => getSeriesCoursesQueryKey(seriesIDRef.value))

  return useQueryWithCache({
    queryKey,
    async queryFn(signal) {
      const id = seriesIDRef.value
      if (id == null) return []
      // Assume a series fits in one API page (at most 100 courses).
      // TODO: Load subsequent pages when a series can exceed this limit.
      const result = await listCourses(
        {
          courseSeriesID: id,
          pageIndex: 1,
          pageSize: 100,
          orderBy: 'sequenceInCourseSeries'
        },
        signal
      )
      return result.data
    },
    staleTime
  })
}

export function useUpdateCourseSeries() {
  const seriesCache = useQueryCache<apis.CourseSeries>()
  const coursesCache = useQueryCache<Course[]>()
  return useAction(
    async function updateCourseSeries(
      courseSeriesID: string,
      params: apis.UpdateCourseSeriesParams,
      signal?: AbortSignal
    ) {
      const series = await apis.updateCourseSeries(courseSeriesID, params, signal)
      seriesCache.invalidateWithOptimisticValue(getSeriesQueryKey(series.id), series)
      // Which courses the series holds, and in what order, may have changed; the new list is not known here.
      coursesCache.discard(getSeriesCoursesQueryKey(series.id))
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
      queryCache.discard(getSeriesQueryKey(courseSeriesID))
      queryCache.discard(getSeriesCoursesQueryKey(courseSeriesID))
    },
    { en: 'Failed to delete course series', zh: '删除课程系列失败' }
  )
}

/** Keeps cached series and their course lists in step with the course writes of `stores/course`. */
export function useCourseChangesInSeries() {
  const seriesCache = useQueryCache<apis.CourseSeries>()
  const coursesCache = useQueryCache<Course[]>()
  return {
    updated(course: Course) {
      coursesCache.update([seriesCoursesQueryKeyPrefix], (courses) =>
        courses.map((c) => (c.id === course.id ? course : c))
      )
    },
    deleted(courseID: string) {
      // The server takes a deleted course out of every series that held it.
      seriesCache.update([seriesQueryKeyPrefix], (series) => ({
        ...series,
        courseIDs: series.courseIDs.filter((id) => id !== courseID)
      }))
      coursesCache.update([seriesCoursesQueryKeyPrefix], (courses) => courses.filter((c) => c.id !== courseID))
    }
  }
}
