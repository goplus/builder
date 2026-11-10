import {
  shallowRef,
  watchEffect,
  effectScope,
  type EffectScope,
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
// eslint-disable-next-line vue/prefer-import-from-vue -- Vue does not re-export these tracking controls.
import { pauseTracking, resetTracking } from '@vue/reactivity'
import {
  useInfiniteQuery as useVueInfiniteQuery,
  useQuery as useVueQuery,
  useQueryClient as useVueQueryClient,
  isCancelledError,
  hashKey,
  type QueryState
} from '@tanstack/vue-query'
import { type LocaleMessage } from '../i18n'
import { useAction, ActionException, Cancelled, capture } from '../exception'
import { until } from '../utils'
import { ProgressReporter, type Progress, ProgressCollector } from '../progress'

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  progress: ShallowRef<Progress>
  refetch: () => void
}

function normalizeQueryError(error: unknown): ActionException {
  return error instanceof ActionException
    ? error
    : new ActionException(error, { en: 'Failed to load data', zh: '加载数据失败' })
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

type QueryComposition = {
  dependOn(query: QueryRet<unknown>): void
  onCleanup(stop: () => void): void
}

const queryCompositions = new WeakMap<QueryContext, QueryComposition>()

/** Keep synchronous callbacks from registering their reads with the surrounding query. */
function withoutTracking<T>(fn: () => T): T {
  pauseTracking()
  try {
    return fn()
  } finally {
    resetTracking()
  }
}

export type QueryOptions<T> = {
  /** Read data. Without queryKey, synchronous reactive accesses are tracked; composeQuery always registers dependencies. */
  queryFn: (ctx: QueryContext) => Promise<T>
  /** Localized summary for query failures; omitted summaries preserve action errors or use a generic message. */
  failureSummaryMessage?: LocaleMessage
  /**
   * Defaults to legacy: retain the result while every fetch enters loading.
   * TODO: Migrate existing consumers to appropriate query modes and remove legacy.
   */
  mode?: QueryMode | 'legacy'
  /** Explicit inputs and identity, without caching. When set, ordinary queryFn reads are not tracked; key changes reset every mode. */
  queryKey?: unknown[] | WatchSource<unknown[]>
}

/**
 * `useQuery`
 * - do query automatically
 * - transform exceptions like `useAction`
 * - manage states for query result
 */
export function useQuery<T>(options: QueryOptions<T>): QueryRet<T> {
  let queryFn = options.queryFn
  if (options.failureSummaryMessage != null) {
    queryFn = useAction(queryFn, options.failureSummaryMessage)
  }
  const result = shallowRef<{ data: T | null; error: ActionException | null; isLoading: boolean }>({
    data: null,
    error: null,
    isLoading: true
  })
  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })

  const mode = options.mode ?? 'legacy'
  const queryKey = options.queryKey
  let hasSuccess = false
  let readScope: EffectScope | null = null

  function startRead(source: QuerySource, identityChanged = false) {
    const previous = readScope
    const scope = effectScope(true)
    readScope = scope
    previous?.stop()
    // Aborting the previous read can synchronously change the key or unmount the consumer.
    if (!scope.active) return
    if (identityChanged || mode === QueryMode.Snapshot) hasSuccess = false

    const dependencyChange = shallowRef<unknown>(null)
    // An async composition can discover more children as its pending reads restart.
    let refetchedChildren = source === 'refetch' ? new Set<QueryRet<unknown>>() : null
    let cancelAttempt: (() => void) | null = null
    scope.run(() => {
      onScopeDispose(() => cancelAttempt?.())
      watchEffect(() => {
        toValue(dependencyChange)
        if (mode === QueryMode.Snapshot && hasSuccess) return
        cancelAttempt?.()
        if (!scope.active) return
        const ctrl = new AbortController()
        const signal = ctrl.signal
        let executing = true
        const dependencies = new Set<QueryRet<unknown>>()
        const subscriptions = new Set<() => void>()
        function stopSubscriptions() {
          subscriptions.forEach((stop) => stop())
          subscriptions.clear()
          dependencies.clear()
          queryCompositions.delete(ctx)
        }
        function cancel() {
          cancelAttempt = null
          stopSubscriptions()
          withoutTracking(() => ctrl.abort(new Cancelled('new query')))
        }
        const reporter = new ProgressReporter((p) => {
          if (!signal.aborted && !(mode === QueryMode.Snapshot && hasSuccess)) progress.value = p
        })
        const ctx: QueryContext = { signal, source, reporter }
        source = 'auto'
        cancelAttempt = cancel
        queryCompositions.set(ctx, {
          dependOn(query) {
            if (dependencies.has(query)) return
            dependencies.add(query)
            if (refetchedChildren != null && !refetchedChildren.has(query)) {
              refetchedChildren.add(query)
              withoutTracking(() => query.refetch())
            }
            signal.throwIfAborted()
            subscriptions.add(
              watch(
                [query.isLoading, query.data, query.error],
                () => {
                  cancel()
                  const notify = () => {
                    if (scope.active && cancelAttempt == null) dependencyChange.value = {}
                  }
                  // Vue suppresses self-triggers when a sibling refetch changes this child inside queryFn.
                  if (executing) queueMicrotask(notify)
                  else notify()
                },
                { flush: 'sync' }
              )
            )
          },
          onCleanup: (stop) => subscriptions.add(stop)
        })

        progress.value = { percentage: 0, timeLeft: null, desc: null }
        if (signal.aborted) return
        const previousResult = withoutTracking(() => result.value)
        const clear = identityChanged || mode === QueryMode.BlockingRefresh || mode === QueryMode.Snapshot
        identityChanged = false
        result.value = {
          data: clear ? null : previousResult.data,
          error: clear ? null : previousResult.error,
          isLoading: mode !== QueryMode.BackgroundRefresh || !hasSuccess
        }
        if (signal.aborted) return
        const pending = queryKey == null ? queryFn(ctx) : withoutTracking(() => queryFn(ctx))
        executing = false
        pending.then(
          (value) => {
            if (signal.aborted) return
            refetchedChildren = null
            hasSuccess = true
            if (mode === QueryMode.Snapshot) stopSubscriptions()
            result.value = { data: value, error: null, isLoading: false }
          },
          (cause) => {
            if (cause instanceof Cancelled || signal.aborted) return
            refetchedChildren = null
            capture(cause, 'useQuery error')
            result.value = { data: result.value.data, error: normalizeQueryError(cause), isLoading: false }
            ctrl.abort(cause)
          }
        )
      })
    })
  }

  const stopKey =
    queryKey == null
      ? null
      : watch(
          () => hashKey(toValue(queryKey)),
          () => startRead('auto', true),
          { immediate: true, flush: 'sync' }
        )
  if (queryKey == null) startRead('auto')
  onBeforeUnmount(() => {
    stopKey?.()
    const scope = readScope
    readScope = null
    scope?.stop()
  })
  const refetch = () => {
    if (readScope != null) startRead('refetch')
  }

  return {
    isLoading: computed(() => result.value.isLoading),
    data: computed({
      get: () => result.value.data,
      set: (data) => {
        result.value = { ...withoutTracking(() => result.value), data }
      }
    }),
    error: computed(() => result.value.error),
    progress,
    refetch
  }
}

export const enum QueryMode {
  /**
   * Return cached data even when stale, and refresh in the background.
   * Publish new data on success; retain data and expose the error on failure.
   */
  BackgroundRefresh = 'backgroundRefresh',
  /**
   * Capture the first valid result, revalidating stale cache data before accepting it.
   * Ignore automatic refreshes; explicit refetch starts a new read. Cached queries also restart on key changes.
   */
  Snapshot = 'snapshot',
  /** Clear the current result and error while awaiting a refreshed result, including offline pauses. */
  BlockingRefresh = 'blockingRefresh'
}

export type QueryWithCacheOptions<T> = {
  /** Shared cache identity, compared by value. Include every input that identifies the result. */
  queryKey: unknown[] | WatchSource<unknown[]>
  /** Fetch data for the current key; receives the request's cancellation signal. */
  queryFn: (signal: AbortSignal) => Promise<T>
  /** Freshness lifetime in milliseconds. Expiry alone does not trigger a refresh. */
  staleTime?: number
  /** Consumer-local result policy; defaults to `QueryMode.BackgroundRefresh`. */
  mode?: QueryMode
  /** Localized summary for query failures; omitted summaries preserve action errors or use a generic message. */
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
  const mode = options.mode ?? QueryMode.BackgroundRefresh
  if (mode === QueryMode.BackgroundRefresh) {
    return {
      isLoading: ret.isLoading,
      data: computed(() => ret.data.value ?? null),
      error: computed(() => (ret.error.value == null ? null : normalizeQueryError(ret.error.value))),
      progress,
      refetch: () => ret.refetch()
    }
  }

  const queryOptions = computed(() =>
    queryClient.defaultQueryOptions({ queryKey: toValue(options.queryKey), staleTime: options.staleTime })
  )
  if (mode === QueryMode.BlockingRefresh) {
    const state = shallowRef<QueryState<T, Error> | null>(null)
    function updateState() {
      state.value = queryClient.getQueryCache().get<T, Error>(queryOptions.value.queryHash)?.state ?? null
    }
    watch(() => queryOptions.value.queryHash, updateState, { immediate: true, flush: 'sync' })
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash === queryOptions.value.queryHash) updateState()
    })
    onScopeDispose(unsubscribe)
    const isLoading = computed(() => {
      const current = state.value
      return (
        current == null ||
        current.status === 'pending' ||
        current.fetchStatus !== 'idle' ||
        (current.isInvalidated && current.status === 'success')
      )
    })
    return {
      isLoading,
      data: computed(() => (isLoading.value || state.value?.status !== 'success' ? null : state.value.data ?? null)),
      error: computed(() =>
        isLoading.value || state.value?.error == null ? null : normalizeQueryError(state.value.error)
      ),
      progress,
      refetch: () => {
        void ret.refetch()
      }
    }
  }

  const result = shallowRef<{ data: T | null; error: ActionException | null } | null>(null)
  let readID = 0

  function fetchResult(id: number, cancelRefetch: boolean) {
    void ret.refetch({ throwOnError: true, cancelRefetch }).then(
      ({ data }) => {
        if (id === readID) result.value = { data: data ?? null, error: null }
      },
      (error: unknown) => {
        if (id !== readID) return
        // Cancellation can restore stale success; join a new fetch instead of accepting that state.
        if (isCancelledError(error)) fetchResult(id, false)
        else result.value = { data: null, error: normalizeQueryError(error) }
      }
    )
  }

  function read(refetch = false) {
    const id = ++readID
    const query = queryClient.getQueryCache().get<T, ActionException>(queryOptions.value.queryHash)
    if (!refetch && query?.state.status === 'success' && !query.isStaleByTime(queryOptions.value.staleTime)) {
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

export type InfiniteQueryRet<T> = QueryRet<T[]> & {
  hasNextPage: Ref<boolean>
  isFetchingNextPage: Ref<boolean>
  /** Fetch the next page, if there is one and no fetching is in progress */
  fetchNextPage: () => void
}

export type InfiniteQueryWithCacheOptions<T> = {
  /** Shared cache identity, compared by value. Include every input that identifies the page sequence. */
  queryKey: unknown[] | WatchSource<unknown[]>
  /** Fetch one page; `pageToken` is `null` for the first page, and `signal` cancels the request. */
  queryFn: (pageToken: string | null, signal: AbortSignal) => Promise<T>
  /** Return the next page token, or `null` when no pages remain. */
  getNextPageToken: (lastPage: T) => string | null
  /** Localized summary for failures; omitted summaries preserve action errors or use a generic message. */
  failureSummaryMessage?: LocaleMessage
}

/**
 * `useInfiniteQueryWithCache` is similar to `useQueryWithCache`, while it queries data page by page.
 * The data is the list of loaded pages. Refetching or invalidating it refetches all loaded pages.
 * It always behaves like `QueryMode.BackgroundRefresh`.
 */
export function useInfiniteQueryWithCache<T>(options: InfiniteQueryWithCacheOptions<T>): InfiniteQueryRet<T> {
  let queryFn = options.queryFn
  if (options.failureSummaryMessage != null) {
    queryFn = useAction(queryFn, options.failureSummaryMessage)
  }

  const ret = useVueInfiniteQuery({
    queryKey: computed(() => toValue(options.queryKey)),
    queryFn: (ctx) => queryFn(ctx.pageParam, ctx.signal),
    initialPageParam: null as string | null,
    getNextPageParam: options.getNextPageToken
  })

  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })
  function fetchNextPage() {
    // Calling `fetchNextPage` of vue-query while fetching cancels and restarts the fetching,
    // so frequent calls (for example, on scrolling) may keep the next page from loading.
    if (!ret.hasNextPage.value || ret.isFetching.value) return
    ret.fetchNextPage()
  }
  return {
    isLoading: ret.isLoading,
    data: computed(() => ret.data.value?.pages ?? null),
    error: computed(() => (ret.error.value == null ? null : normalizeQueryError(ret.error.value))),
    progress,
    refetch: () => ret.refetch(),
    hasNextPage: ret.hasNextPage,
    isFetchingNextPage: ret.isFetchingNextPage,
    fetchNextPage
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
  ctx.signal.throwIfAborted()
  const composition = queryCompositions.get(ctx)
  if (composition != null) composition.dependOn(queryRet)
  else if (ctx.source === 'refetch') queryRet.refetch()

  const collector = getCollector(ctx.reporter)
  const subReporter = collector.getSubReporter(...(subReportParams ?? []))
  const stopWatch = watch(queryRet.progress, (p) => subReporter.report(p), { immediate: true })
  if (composition != null) composition.onCleanup(stopWatch)
  ctx.signal.addEventListener('abort', stopWatch, { once: true })

  return untilLoaded(queryRet, ctx.signal)
}
