import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { useUserStore } from './signed-in'

export * from './signed-in'

function getUserQueryKey(username: string) {
  return ['user', username]
}

const staleTime = 1000 * 60 * 5 // 5min

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

export function useUpdateSignedInUser() {
  const userStore = useUserStore()
  const queryCache = useQueryCache()
  return useAction(
    async function updateSignedInUser(params: apis.UpdateSignedInUserParams) {
      const updated = await apis.updateSignedInUser(params)
      queryCache.invalidate(getUserQueryKey(userStore.getSignedInUser()!.name))
      return updated
    },
    { en: 'Failed to update profile', zh: '更新个人信息失败' }
  )
}
