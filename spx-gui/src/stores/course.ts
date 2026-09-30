import { computed, toRef, type WatchSource } from 'vue'

import * as apis from '@/apis/course'
import { useAction } from '@/utils/exception'
import { useQueryCache, useQueryWithCache } from '@/utils/query'
import { useCourseChangesInSeries } from './course-series'

function getCourseQueryKey(courseID: string) {
  return ['course', courseID]
}

const staleTime = 5 * 60 * 1000

export function useCourse(courseID: WatchSource<string>) {
  const courseIDRef = toRef(courseID)
  return useQueryWithCache({
    queryKey: computed(() => getCourseQueryKey(courseIDRef.value)),
    queryFn: (signal) => apis.getCourse(courseIDRef.value, signal),
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course', zh: '加载课程失败' }
  })
}

export function useUpdateCourse() {
  const courseCache = useQueryCache<apis.Course>()
  const inSeries = useCourseChangesInSeries()
  return useAction(
    async function updateCourse(courseID: string, params: apis.UpdateCourseParams, signal?: AbortSignal) {
      const course = await apis.updateCourse(courseID, params, signal)
      courseCache.invalidateWithOptimisticValue(getCourseQueryKey(course.id), course)
      inSeries.updated(course)
      return course
    },
    { en: 'Failed to update course', zh: '更新课程失败' }
  )
}

export function useDeleteCourse() {
  const courseCache = useQueryCache()
  const inSeries = useCourseChangesInSeries()
  return useAction(
    async function deleteCourse(courseID: string) {
      await apis.deleteCourse(courseID)
      courseCache.discard(getCourseQueryKey(courseID))
      inSeries.deleted(courseID)
    },
    { en: 'Failed to delete course', zh: '删除课程失败' }
  )
}

export type DeleteCourse = ReturnType<typeof useDeleteCourse>
