import { computed, toRef, type WatchSource } from 'vue'

import { getCourse } from '@/apis/course'
import { useQueryWithCache } from '@/utils/query'

const staleTime = 5 * 60 * 1000

export function useCourse(courseID: WatchSource<string>) {
  const courseIDRef = toRef(courseID)
  return useQueryWithCache({
    queryKey: computed(() => ['course', courseIDRef.value]),
    queryFn: (signal) => getCourse(courseIDRef.value, signal),
    staleTime,
    failureSummaryMessage: { en: 'Failed to load course', zh: '加载课程失败' }
  })
}
