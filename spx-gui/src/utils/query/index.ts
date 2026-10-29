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
import { useQuery as useVueQuery, useQueryClient as useVueQueryClient, isCancelledError } from '@tanstack/vue-query'
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

export type QueryMode = 'live' | 'snapshot'

export type QueryWithCacheOptions<T> = {
  queryKey: unknown[] | WatchSource<unknown[]>
  queryFn: (signal: AbortSignal) => Promise<T>
  staleTime?: number
  /**
   * Consumer-local result policy; defaults to `live`.
   * - `live`: retain data and loading state during refresh; publish new data or the refresh error.
   * - `snapshot`: retain the first valid success for the current key, ignoring subsequent shared-cache changes.
   *   Invalidated/expired results needing revalidation cannot satisfy the initial read; successful null/falsy values can.
   *   Initial reads and explicit refetch expose null data/error and loading while awaiting a valid result, including offline pauses.
   *   Failures expose an error with null data and end loading. Key changes start a new read; refetch replaces the snapshot.
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
  const mode = options.mode ?? 'live'
  if (mode === 'live') {
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
  const result = shallowRef<{ data: T | null; error: ActionException | null } | null>(null)
  let readID = 0

  function fetchResult(id: number, cancelRefetch: boolean) {
    void ret.refetch({ throwOnError: true, cancelRefetch }).then(
      ({ data }) => {
        if (id === readID) result.value = { data: data ?? null, error: null }
      },
      (error: ActionException) => {
        if (id !== readID) return
        // Cancellation can restore stale success; join a new fetch instead of accepting that state.
        if (isCancelledError(error)) fetchResult(id, false)
        else result.value = { data: null, error }
      }
    )
  }

  function read(refetch = false) {
    const id = ++readID
    const query = queryClient.getQueryCache().get<T, ActionException>(queryOptions.value.queryHash)
    if (
      !refetch &&
      query?.state.status === 'success' &&
      query.state.fetchStatus === 'idle' &&
      !query.isStaleByTime(queryOptions.value.staleTime)
    ) {
      result.value = { data: query.state.data ?? null, error: null }
      return
    }
    result.value = null
    fetchResult(id, refetch)
  }

  watch(
    () => queryOptions.value.queryHash,
    () => read(),
    { immediate: true, flush: 'sync' }
  )
  onScopeDispose(() => readID++)

  return {
    isLoading: computed(() => result.value == null),
    data: computed(() => result.value?.data ?? null),
    error: computed(() => result.value?.error ?? null),
    progress,
    refetch: () => read(true)
  }
}

/** Manage cache of `useQueryWithCache` */
export function useQueryCache() {
  const queryClient = useVueQueryClient()

  async function invalidateAndRefetch(filters: { queryKey: unknown[]; exact?: boolean }) {
    // Vue Query 5.36.1 defers invalidateQueries() with setTimeout(0), including marking data invalid.
    // Mark it synchronously so a snapshot mounted immediately after navigation cannot capture the old cache.
    // Defer only refetching until reactive query inputs have settled.
    queryClient
      .getQueryCache()
      .findAll(filters)
      .forEach((query) => query.invalidate())
    await nextTick()
    return queryClient.refetchQueries(
      { ...filters, type: 'active', predicate: (query) => query.state.isInvalidated },
      { cancelRefetch: false }
    )
  }

  /** Invalidate queries matching a key prefix and refresh active queries. */
  function invalidate(queryKeyPrefix: unknown[]) {
    const filters = { queryKey: queryKeyPrefix }
    void queryClient.cancelQueries(filters)
    return invalidateAndRefetch(filters)
  }

  /** Write one exact cache entry, then invalidate it and refresh it if active. */
  function invalidateWithOptimisticValue<T>(queryKey: unknown[], optimisticValue: T) {
    // A response from a GET started before this write must not overwrite its new value.
    const filters = { queryKey, exact: true }
    void queryClient.cancelQueries(filters)
    queryClient.setQueryData(queryKey, optimisticValue)
    return invalidateAndRefetch(filters)
  }

  /** Update existing non-null results matching a prefix, then invalidate and refresh active matches. */
  function invalidateMatchingWithOptimisticUpdater<T>(queryKeyPrefix: unknown[], updater: (data: T) => T) {
    const filters = { queryKey: queryKeyPrefix }
    void queryClient.cancelQueries(filters)
    queryClient.setQueriesData<T>(filters, (data) => (data == null ? data : updater(data)))
    return invalidateAndRefetch(filters)
  }

  return { invalidate, invalidateWithOptimisticValue, invalidateMatchingWithOptimisticUpdater }
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
  // Await yields even when already loaded; a refetch or cancellation may occur before execution resumes.
  // Recheck both before consuming the result.
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
    // Track the composed result so changes to its loading, data or error rerun the parent query.
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
