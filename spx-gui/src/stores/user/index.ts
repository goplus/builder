import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache } from '@/utils/query'
import * as apis from '@/apis/user'
import { getUserQueryKey } from './query-keys'

export * from './signed-in'

const staleTime = 5 * 60 * 1000 // 5min

export function useUser(username: WatchSource<string | null>) {
  const usernameRef = toRef(username)
  const queryKey = computed(() => getUserQueryKey(usernameRef.value ?? ''))
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      if (usernameRef.value == null) return null
      return apis.getUser(usernameRef.value)
    },
    failureSummaryMessage: {
      en: 'Failed to load user information',
      zh: '加载用户信息失败'
    },
    staleTime
  })
}
