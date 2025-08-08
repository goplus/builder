import { computed, toRef, type WatchSource } from 'vue'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/project'
import { isSignedIn, getSignedInUsername } from './user'

function getLikingQueryKey(owner: string, name: string) {
  return ['liking', getSignedInUsername(), owner, name]
}

const staleTime = 5 * 60 * 1000 // 5min

export function useIsLikingProject(project: WatchSource<{ owner: string; name: string }>) {
  const projectRef = toRef(project)
  const queryKey = computed(() => {
    const { owner, name } = projectRef.value
    return getLikingQueryKey(owner, name)
  })
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      if (!isSignedIn()) return false
      return apis.isLiking(projectRef.value.owner, projectRef.value.name)
    },
    failureSummaryMessage: { en: 'Failed to check liking status', zh: '检查喜欢状态失败' },
    staleTime
  })
}

export function useLikeProject() {
  const queryCache = useQueryCache()
  return useAction(
    async function likeProject(owner: string, name: string) {
      await apis.likeProject(owner, name)
      const queryKey = getLikingQueryKey(owner, name)
      queryCache.invalidateWithOptimisticValue(queryKey, true)
    },
    { en: 'Failed to like', zh: '标记喜欢失败' }
  )
}

export function useUnlikeProject() {
  const queryCache = useQueryCache()
  return useAction(
    async function unlikeProject(owner: string, name: string) {
      await apis.unlikeProject(owner, name)
      const queryKey = getLikingQueryKey(owner, name)
      queryCache.invalidateWithOptimisticValue(queryKey, false)
    },
    { en: 'Failed to unlike', zh: '取消喜欢失败' }
  )
}
