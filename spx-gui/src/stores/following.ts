import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { useSignedInUser } from './user'

function getFollowingQueryKey(signedInUsernameInput: string | null, username: string) {
  return ['following', signedInUsernameInput, username]
}

const staleTime = 5 * 60 * 1000 // 5min

export function useIsFollowing(username: WatchSource<string>) {
  const usernameRef = toRef(username)
  const signedInUser = useSignedInUser()
  const queryKey = computed(() => getFollowingQueryKey(signedInUser.value?.username ?? null, usernameRef.value))
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      const signedInUsernameInput = signedInUser.value?.username ?? null
      if (signedInUsernameInput == null || signedInUsernameInput === usernameRef.value) return false
      return apis.isFollowing(usernameRef.value)
    },
    failureSummaryMessage: { en: 'Failed to check following status', zh: '检查关注状态失败' },
    staleTime
  })
}

export function useFollow() {
  const queryCache = useQueryCache()
  const signedInUser = useSignedInUser()
  return useAction(
    async function follow(username: string) {
      await apis.follow(username)
      const queryKey = getFollowingQueryKey(signedInUser.value?.username ?? null, username)
      queryCache.invalidateWithOptimisticValue(queryKey, true)
    },
    { en: 'Failed to follow', zh: '关注用户失败' }
  )
}

export function useUnfollow() {
  const queryCache = useQueryCache()
  const signedInUser = useSignedInUser()
  return useAction(
    async function unfollow(username: string) {
      await apis.unfollow(username)
      const queryKey = getFollowingQueryKey(signedInUser.value?.username ?? null, username)
      queryCache.invalidateWithOptimisticValue(queryKey, false)
    },
    { en: 'Failed to unfollow', zh: '取消关注失败' }
  )
}
