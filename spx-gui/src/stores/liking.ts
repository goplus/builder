import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/project'
import { useUserStore, type UserInfo } from './user'

function getLikingQueryKey(signedInUser: UserInfo | null, owner: string, name: string) {
  return ['liking', signedInUser?.name ?? null, owner, name]
}

const staleTime = 1000 * 60 * 5 // 5min

export function useIsLikingProject(project: WatchSource<{ owner: string; name: string }>) {
  const userStore = useUserStore()
  const projectRef = toRef(project)
  const queryKey = computed(() => {
    const { owner, name } = projectRef.value
    return getLikingQueryKey(userStore.getSignedInUser(), owner, name)
  })
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      if (!userStore.isSignedIn()) return false
      return apis.isLiking(projectRef.value.owner, projectRef.value.name)
    },
    failureSummaryMessage: { en: 'Failed to check liking status', zh: '检查喜欢状态失败' },
    staleTime
  })
}

export function useLikeProject() {
  const userStore = useUserStore()
  const queryCache = useQueryCache()
  return useAction(
    async function likeProject(owner: string, name: string) {
      await apis.likeProject(owner, name)
      const queryKey = getLikingQueryKey(userStore.getSignedInUser(), owner, name)
      queryCache.invalidateWithOptimisticValue(queryKey, true)
    },
    { en: 'Failed to like', zh: '标记喜欢失败' }
  )
}

export function useUnlikeProject() {
  const userStore = useUserStore()
  const queryCache = useQueryCache()
  return useAction(
    async function unlikeProject(owner: string, name: string) {
      await apis.unlikeProject(owner, name)
      const queryKey = getLikingQueryKey(userStore.getSignedInUser(), owner, name)
      queryCache.invalidateWithOptimisticValue(queryKey, false)
    },
    { en: 'Failed to unlike', zh: '取消喜欢失败' }
  )
}
