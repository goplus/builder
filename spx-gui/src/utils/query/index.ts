import {
  shallowRef,
  watchEffect,
  type Ref,
  type ShallowRef,
  type WatchSource,
  computed,
  ref,
  onBeforeUnmount,
  toValue,
  watch,
  onScopeDispose,
  nextTick
} from 'vue'
import { useQuery as useVueQuery, useQueryClient as useVueQueryClient, type QueryState } from '@tanstack/vue-query'
import { type LocaleMessage } from '../i18n'
import { useAction, type ActionException, Cancelled, capture } from '../exception'
import { until } from '../utils'
import { ProgressReporter, type Progress, ProgressCollector } from '../progress'

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  progress: ShallowRef<Progress>
  refetch: () => void
}

/** Wraps existing data as a successful QueryRet, preserving reactive sources; refetch is a no-op. */
export function createResolvedQueryRet<T>(data: WatchSource<T | null>): QueryRet<T> {
  return {
    data: computed(() => toValue<T | null>(data)),
    isLoading: ref(false),
    error: shallowRef(null),
    progress: shallowRef({ percentage: 1, timeLeft: null, desc: null }),
    refetch: () => {}
  }
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

export type QueryOptions = {
  /** Clear previous data and error when a new fetch starts. */
  clearResultOnFetch?: boolean
}

/**
 * `useQuery`
 * - do query automatically
 * - transform exceptions like `useAction`
 * - manage states for query result
 */
export function useQuery<T>(
  queryFn: (ctx: QueryContext) => Promise<T>,
  failureSummaryMessage?: LocaleMessage,
  options: QueryOptions = {}
): QueryRet<T> {
  if (failureSummaryMessage != null) {
    queryFn = useAction(queryFn, failureSummaryMessage)
  }
  const isLoading = ref(false)
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ActionException | null>(null)
  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })

  let lastCtrl: AbortController | null = null
  const abortLast = (reason: Cancelled) => {
    const ctrl = lastCtrl
    lastCtrl = null
    ctrl?.abort(reason)
  }
  onBeforeUnmount(() => abortLast(new Cancelled('unmounted')))

  function fetch(source: QuerySource) {
    const ctrl = new AbortController()
    lastCtrl = ctrl
    const signal = ctrl.signal
    progress.value = { percentage: 0, timeLeft: null, desc: null }
    const reporter = new ProgressReporter((p) => {
      if (signal.aborted) return
      progress.value = p
    })
    if (options.clearResultOnFetch) {
      data.value = null
      error.value = null
    }
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
        ctrl.abort(e)
      }
    )
  }

  watchEffect((onCleanup) => {
    // Cleanup runs outside dependency tracking, so abort listeners cannot become query dependencies.
    onCleanup(() => abortLast(new Cancelled('new query')))
    fetch('auto')
  })

  const refetch = () => {
    abortLast(new Cancelled('new query'))
    fetch('refetch')
  }

  return { isLoading, data, error, progress, refetch }
}

export type QueryMode = 'background' | 'blocking' | 'snapshot'

export type QueryWithCacheOptions<T> = {
  queryKey: unknown[] | WatchSource<unknown[]>
  queryFn: (signal: AbortSignal) => Promise<T>
  staleTime?: number
  /**
   * Consumer-local result policy; defaults to `background`.
   * - `background`: retain data and loading state during refresh; publish new data or the refresh error.
   * - `blocking`: expose null data/error and loading while awaiting a required result, including offline pauses.
   *   On failure, expose the error with null data and end loading.
   * - `snapshot`: retain the first valid success for the current key, ignoring subsequent shared-cache changes.
   *   Invalidated/expired results needing revalidation cannot satisfy the initial read; successful null/falsy values can.
   *   Key changes start a new read. Explicit refetch uses blocking semantics and replaces the snapshot on success.
   */
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
  const result = shallowRef<QueryState<T, ActionException> | null>(null)
  // A canceled fetch can restore old success; only a later successful revision satisfies a required read.
  let waitingAfter: number | null = null

  function startRead() {
    waitingAfter = cache.get(queryOptions.value.queryHash)?.state.dataUpdateCount ?? 0
    result.value = null
  }

  function update(failed = false) {
    if (mode === 'snapshot' && result.value?.status === 'success') return
    const query = cache.get<T, ActionException>(queryOptions.value.queryHash)
    if (query == null) return
    const current = query.state
    if (current.fetchStatus === 'idle' && current.status === 'error' && (failed || !current.isInvalidated)) {
      result.value = current
    } else if (current.fetchStatus !== 'idle' || current.isInvalidated || current.status === 'pending') {
      waitingAfter ??= current.dataUpdateCount
      result.value = null
    } else if (waitingAfter == null || current.dataUpdateCount > waitingAfter) {
      waitingAfter = null
      result.value = current
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
    isLoading: computed(() => result.value == null),
    data: computed(() => (result.value?.status === 'success' ? result.value.data ?? null : null)),
    error: computed(() => result.value?.error ?? null),
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
  async function invalidate(queryKey: unknown[]) {
    void queryClient.cancelQueries({ queryKey })
    // Revoke stale reads before navigation; let reactive query inputs settle before refetching.
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => query.invalidate())
    await nextTick()
    return queryClient.refetchQueries(
      { queryKey, type: 'active', predicate: (query) => query.state.isInvalidated },
      { cancelRefetch: false }
    )
  }

  function invalidateWithOptimisticValue(queryKey: unknown[], optimisticValue: T | ((data: T) => T)) {
    // A response from a GET started before this write must not overwrite its new value.
    void queryClient.cancelQueries({ queryKey })
    if (typeof optimisticValue === 'function') {
      queryClient.setQueriesData<T>({ queryKey }, (data) =>
        data == null ? data : (optimisticValue as (data: T) => T)(data)
      )
    } else {
      queryClient.setQueryData(queryKey, optimisticValue)
    }
    return invalidate(queryKey)
  }

  return { invalidate, invalidateWithOptimisticValue }
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
    // Background queries can publish data and errors without changing loading state.
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
