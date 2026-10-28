import {
  shallowRef,
  watchEffect,
  type Ref,
  type ShallowRef,
  type WatchSource,
  computed,
  ref,
  onUnmounted,
  toValue,
  watch,
  onScopeDispose
} from 'vue'
import { useQuery as useVueQuery, useQueryClient as useVueQueryClient } from '@tanstack/vue-query'
import { type LocaleMessage } from './i18n'
import { useAction, type ActionException, Cancelled, capture } from './exception'
import { until } from './utils'
import { ProgressReporter, type Progress, ProgressCollector } from './progress'

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  progress: ShallowRef<Progress>
  refetch: () => void
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
  /** Progress reporter for the query */
  reporter: ProgressReporter
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
  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })

  let lastCtrl: AbortController | null = null
  onUnmounted(() => lastCtrl?.abort(new Cancelled('unmounted')))
  const getSignal = () => {
    if (lastCtrl != null) lastCtrl.abort(new Cancelled('new query'))
    const ctrl = new AbortController()
    lastCtrl = ctrl
    return ctrl.signal
  }

  function fetch(source: QuerySource) {
    const signal = getSignal()
    progress.value = { percentage: 0, timeLeft: null, desc: null }
    const reporter = new ProgressReporter((p) => {
      if (signal.aborted) return
      progress.value = p
    })
    isLoading.value = true
    queryFn({ signal, source, reporter }).then(
      (d) => {
        if (signal.aborted) return
        data.value = d
        error.value = null
        isLoading.value = false
      },
      (e) => {
        if (e instanceof Cancelled) return
        if (signal.aborted) return
        capture(e, 'useQuery error')
        error.value = e
        isLoading.value = false
      }
    )
  }

  watchEffect(() => fetch('auto'))

  const refetch = () => fetch('refetch')

  return { isLoading, data, error, progress, refetch }
}

export type QueryMode = 'background' | 'blocking' | 'snapshot'

export type QueryWithCacheOptions<T> = {
  queryKey: unknown[] | WatchSource<unknown[]>
  queryFn: (signal: AbortSignal) => Promise<T>
  staleTime?: number
  /** Background keeps current results; blocking waits for refreshes; snapshot retains the first valid success per key/refetch. */
  mode?: QueryMode
  failureSummaryMessage?: LocaleMessage
}

/** `useQueryWithCache` is similar to `useQuery`, while it uses `vue-query` for caching. */
export function useQueryWithCache<T>(options: QueryWithCacheOptions<T>): QueryRet<T> {
  const queryClient = useVueQueryClient()
  let queryFn = options.queryFn
  if (options.failureSummaryMessage != null) {
    queryFn = useAction(queryFn, options.failureSummaryMessage)
  }

  const ret = useVueQuery({
    queryKey: computed(() => toValue(options.queryKey)),
    queryFn: (ctx) => queryFn(ctx.signal),
    staleTime: options.staleTime
  })

  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })
  const mode = options.mode ?? 'background'
  if (mode === 'background') {
    return {
      isLoading: ret.isLoading,
      data: computed(() => ret.data.value ?? null),
      error: ret.error as Ref<ActionException | null>,
      progress,
      refetch: () => ret.refetch()
    }
  }

  const queryOptions = computed(() =>
    queryClient.defaultQueryOptions({ queryKey: toValue(options.queryKey), staleTime: options.staleTime })
  )
  const cache = queryClient.getQueryCache()
  const state = shallowRef<{ data: T | null; error: ActionException | null; isLoading: boolean }>({
    data: null,
    error: null,
    isLoading: true
  })
  let captured = false
  let waitingAfter: number | null = null

  function startRead() {
    captured = false
    waitingAfter = cache.get(queryOptions.value.queryHash)?.state.dataUpdateCount ?? 0
    state.value = { data: null, error: null, isLoading: true }
  }

  function update(failed = false) {
    if (captured) return
    const query = cache.get<T, ActionException>(queryOptions.value.queryHash)
    if (query == null) return
    const current = query.state
    if (current.fetchStatus === 'idle' && current.status === 'error' && (failed || !current.isInvalidated)) {
      state.value = { data: null, error: current.error, isLoading: false }
    } else if (current.fetchStatus !== 'idle' || current.isInvalidated || current.status === 'pending') {
      waitingAfter ??= current.dataUpdateCount
      state.value = { data: null, error: null, isLoading: true }
    } else if (waitingAfter == null || current.dataUpdateCount > waitingAfter) {
      waitingAfter = null
      captured = mode === 'snapshot'
      state.value = { data: current.data ?? null, error: null, isLoading: false }
    }
  }

  watch(
    () => queryOptions.value.queryHash,
    () => {
      startRead()
      const query = cache.get(queryOptions.value.queryHash)
      if (query != null && !query.isStaleByTime(queryOptions.value.staleTime)) waitingAfter = null
      update()
    },
    { immediate: true, flush: 'sync' }
  )
  // Cache events carry an atomic state, including invalidation when isStale was already true.
  const unsubscribe = cache.subscribe((event) => {
    if (event.type === 'updated' && event.query.queryHash === queryOptions.value.queryHash) {
      update(event.action.type === 'error')
    }
  })
  onScopeDispose(unsubscribe)

  return {
    isLoading: computed(() => state.value.isLoading),
    data: computed(() => state.value.data),
    error: computed(() => state.value.error),
    progress,
    refetch: () => {
      startRead()
      void ret.refetch()
    }
  }
}

/** Manage cache of `useQueryWithCache` */
export function useQueryCache<T>() {
  const queryClient = useVueQueryClient()

  /**
   * Invalidate all queries whose keys start with the provided queryKey.
   * @see https://tanstack.com/query/latest/docs/framework/vue/guides/query-invalidation#query-matching-with-invalidatequeries
   */
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

const composedReporterCollectorMap = new WeakMap<ProgressReporter, ProgressCollector>()

function getCollector(reporter: ProgressReporter) {
  let collector = composedReporterCollectorMap.get(reporter)
  if (collector == null) {
    collector = ProgressCollector.collectorFor(reporter)
    composedReporterCollectorMap.set(reporter, collector)
  }
  return collector
}

export type SubReporterParams = Parameters<ProgressCollector['getSubReporter']>

/** Wait until a query is loaded, then return its data or throw its error. */
export async function untilLoaded<T>(queryRet: QueryRet<T>, signal?: AbortSignal): Promise<T> {
  do {
    await until(() => !queryRet.isLoading.value, signal)
    signal?.throwIfAborted()
  } while (queryRet.isLoading.value)
  if (queryRet.error.value != null) throw queryRet.error.value
  return queryRet.data.value!
}

/**
 * Compose query in another query.
 * - If the query is loading, wait until it's done.
 * - If the query failed, error will be thrown.
 * - If the query is successful, the data will be returned.
 * - Composed query will be collected as dependencies.
 */
export async function composeQuery<T>(
  ctx: QueryContext,
  queryRet: QueryRet<T>,
  subReportParams?: SubReporterParams
): Promise<T> {
  if (ctx.source === 'refetch') {
    queryRet.refetch()
  } else {
    // Background refreshes can publish data/errors without a loading transition.
    toValue(queryRet.isLoading)
    toValue(queryRet.data)
    toValue(queryRet.error)
  }

  const collector = getCollector(ctx.reporter)
  const subReporter = collector.getSubReporter(...(subReportParams ?? []))
  const stopWatch = watch(queryRet.progress, (p) => subReporter.report(p), { immediate: true })
  ctx.signal.addEventListener('abort', () => stopWatch())

  return untilLoaded(queryRet, ctx.signal)
}
