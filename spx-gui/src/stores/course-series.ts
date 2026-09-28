import { computed, toRef, type WatchSource } from 'vue'

import { listCourses } from '@/apis/course'
import { useQueryWithCache } from '@/utils/query'

function getSeriesCoursesQueryKey(seriesID: string | null) {
  return ['course-series-courses', seriesID]
}

const staleTime = 5 * 60 * 1000

export function useSeriesCourses(seriesID: WatchSource<string | null>) {
  const seriesIDRef = toRef(seriesID)
  const queryKey = computed(() => getSeriesCoursesQueryKey(seriesIDRef.value))

  return useQueryWithCache({
    queryKey,
    async queryFn(signal) {
      const id = seriesIDRef.value
      if (id == null) return []
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
