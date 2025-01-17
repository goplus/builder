import {
  shallowRef,
  watchEffect,
  type Ref,
  type ShallowRef,
  type WatchSource,
  computed,
  ref,
  onUnmounted,
  toValue
} from 'vue'
import { useQuery as useVueQuery, useQueryClient as useVueQueryClient } from '@tanstack/vue-query'
import { type LocaleMessage } from './i18n'
import { mergeSignals } from './disposable'
import { useAction, type ActionException, Cancelled } from './exception'
import { until } from './utils'

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  refetch: (signal?: AbortSignal) => void
}

/**
 * Source of query triggering.
 * - `auto`: query is triggered automatically for dependencies' change.
 * - `refetch`: query is triggered manually by `refetch`.
 */
export type QuerySource = 'auto' | 'refetch'

export type QueryContext = {
  /** Signal for aborting the query. */
  signal: AbortSignal
  /** Source of query fn calling. */
  source: QuerySource
}

/**
 * `useQuery`
 * - do query automatically
 * - transform exceptions like `useAction`
 * - manage states for query result
 */
export function useQuery<T>(
  queryFn: (ctx: QueryContext) => Promise<T>,
  failureSummaryMessage?: LocaleMessage
): QueryRet<T> {
  if (failureSummaryMessage != null) {
    queryFn = useAction(queryFn, failureSummaryMessage)
  }
  const isLoading = ref(false)
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ActionException | null>(null)

  let lastCtrl: AbortController | null = null
  onUnmounted(() => lastCtrl?.abort(new Cancelled('unmounted')))
  const getSignal = () => {
    if (lastCtrl != null) lastCtrl.abort(new Cancelled('new query'))
    const ctrl = new AbortController()
    lastCtrl = ctrl
    return ctrl.signal
  }

  function fetch(source: QuerySource, signal?: AbortSignal) {
    const finalSignal = mergeSignals(signal, getSignal())
    isLoading.value = true
    queryFn({ signal: finalSignal, source }).then(
      (d) => {
        data.value = d
        error.value = null
        isLoading.value = false
      },
      (e) => {
        if (e instanceof Cancelled) return
        console.warn(e)
        error.value = e
        isLoading.value = false
      }
    )
  }

  watchEffect(() => fetch('auto'))

  const refetch = (signal?: AbortSignal) => fetch('refetch', signal)

  return { isLoading, data, error, refetch }
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

/**
 * Compose query in another query.
 * - If the query is loading, wait until it's done.
 * - If the query failed, error will be thrown.
 * - If the query is successful, the data will be returned.
 * - Composed query will be collected as dependencies.
 */
export async function composeQuery<T>(ctx: QueryContext, queryRet: QueryRet<T>): Promise<T> {
  if (ctx.source === 'refetch') {
    queryRet.refetch(ctx.signal)
  } else {
    toValue(queryRet.isLoading) // Trigger dependency collection
  }
  return new Promise<T>((resolve, reject) => {
    until(() => !queryRet.isLoading.value, ctx.signal).then(() => {
      if (queryRet.error.value != null) reject(queryRet.error.value)
      else resolve(queryRet.data.value!)
    })
  })
}
