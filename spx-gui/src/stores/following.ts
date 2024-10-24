import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { useUserStore, type UserInfo } from './user'

function getFollowingQueryKey(signedInUser: UserInfo | null, username: string) {
  return ['following', signedInUser?.name ?? null, username]
}

const staleTime = 5 * 60 * 1000 // 5min

export function useIsFollowing(username: WatchSource<string>) {
  const userStore = useUserStore()
  const usernameRef = toRef(username)
  const queryKey = computed(() =>
    getFollowingQueryKey(userStore.getSignedInUser(), usernameRef.value)
  )
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      const userInfo = userStore.getSignedInUser()
      if (userInfo == null || userInfo.name === usernameRef.value) return false
      return apis.isFollowing(usernameRef.value)
    },
    failureSummaryMessage: { en: 'Failed to check following status', zh: '检查关注状态失败' },
    staleTime
  })
}

export function useFollow() {
  const userStore = useUserStore()
  const queryCache = useQueryCache()
  return useAction(
    async function follow(username: string) {
      await apis.follow(username)
      const queryKey = getFollowingQueryKey(userStore.getSignedInUser(), username)
      queryCache.invalidateWithOptimisticValue(queryKey, true)
    },
    { en: 'Failed to follow', zh: '关注用户失败' }
  )
}

export function useUnfollow() {
  const userStore = useUserStore()
  const queryCache = useQueryCache()
  return useAction(
    async function unfollow(username: string) {
      await apis.unfollow(username)
      const queryKey = getFollowingQueryKey(userStore.getSignedInUser(), username)
      queryCache.invalidateWithOptimisticValue(queryKey, false)
    },
    { en: 'Failed to unfollow', zh: '取消关注失败' }
  )
}
