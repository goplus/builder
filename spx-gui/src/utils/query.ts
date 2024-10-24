import { shallowRef, watchEffect, type Ref, type ShallowRef, type WatchSource, computed } from 'vue'
import { useQuery as useVueQuery, useQueryClient as useVueQueryClient } from '@tanstack/vue-query'
import { type LocaleMessage } from './i18n'
import { getCleanupSignal, type OnCleanup } from './disposable'
import { useAction, type ActionException } from './exception'
import { useFnWithLoading } from './utils'

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  refetch: (signal?: AbortSignal) => void
}

/**
 * `useQuery`
 * - do query automatically
 * - transform exceptions like `useAction`
 * - manage states for query result
 */
export function useQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  failureSummaryMessage?: LocaleMessage
): QueryRet<T> {
  if (failureSummaryMessage != null) {
    queryFn = useAction(queryFn, failureSummaryMessage)
  }
  const withLoading = useFnWithLoading(queryFn)
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ActionException | null>(null)

  function fetch(onCleanup: OnCleanup) {
    const signal = getCleanupSignal(onCleanup)
    withLoading.fn(signal).then(
      (d) => {
        data.value = d
        error.value = null
      },
      (e) => {
        error.value = e
        console.warn(e)
      }
    )
  }

  function refetch() {
    fetch(() => {})
  }

  watchEffect(fetch)

  return { isLoading: withLoading.isLoading, data, error, refetch }
}

export type QueryWithCacheOptions<T> = {
  queryKey: unknown[] | WatchSource<unknown[]>
  queryFn: (signal: AbortSignal) => Promise<T>
  staleTime?: number
  failureSummaryMessage?: LocaleMessage
}

/** `useQueryWithCache` is similar to `useQuery`, while it uses `vue-query` for caching. */
export function useQueryWithCache<T>(options: QueryWithCacheOptions<T>): QueryRet<T> {
  let queryFn = options.queryFn
  if (options.failureSummaryMessage != null) {
    queryFn = useAction(queryFn, options.failureSummaryMessage)
  }

  const ret = useVueQuery({
    queryKey: options.queryKey,
    queryFn: (ctx) => queryFn(ctx.signal),
    staleTime: options.staleTime
  })

  const isLoading = ret.isLoading
  const data = computed(() => ret.data.value ?? null)
  const error = ret.error as Ref<ActionException | null>
  const refetch = () => ret.refetch()
  return { isLoading, data, error, refetch }
}

/** Manage cache of `useQueryWithCache` */
export function useQueryCache<T>() {
  const queryClient = useVueQueryClient()

  function invalidate(queryKey: unknown[]) {
    return queryClient.invalidateQueries({ queryKey })
  }

  function invalidateWithOptimisticValue(queryKey: unknown[], optimisticValue: T) {
    queryClient.setQueryData(queryKey, optimisticValue)
    return invalidate(queryKey)
  }

  return {
    invalidate,
    invalidateWithOptimisticValue
  }
}
