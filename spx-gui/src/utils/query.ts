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
  watch
} from 'vue'
import {
  useInfiniteQuery as useVueInfiniteQuery,
  useQuery as useVueQuery,
  useQueryClient as useVueQueryClient
} from '@tanstack/vue-query'
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
  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })
  const refetch = () => ret.refetch()
  return { isLoading, data, error, progress, refetch }
}

export type InfiniteQueryRet<T> = QueryRet<T[]> & {
  hasNextPage: Ref<boolean>
  isFetchingNextPage: Ref<boolean>
  /** Fetch the next page, if there is one and no fetching is in progress */
  fetchNextPage: () => void
}

export type InfiniteQueryWithCacheOptions<T> = {
  queryKey: unknown[] | WatchSource<unknown[]>
  /** Query one page, with `pageToken` `null` for the first page */
  queryFn: (pageToken: string | null, signal: AbortSignal) => Promise<T>
  /** Get the token of the page after `lastPage`, `null` if there are no more pages */
  getNextPageToken: (lastPage: T) => string | null
  failureSummaryMessage?: LocaleMessage
}

/**
 * `useInfiniteQueryWithCache` is similar to `useQueryWithCache`, while it queries data page by page.
 * The data is the list of loaded pages. Refetching or invalidating it refetches all loaded pages.
 */
export function useInfiniteQueryWithCache<T>(options: InfiniteQueryWithCacheOptions<T>): InfiniteQueryRet<T> {
  let queryFn = options.queryFn
  if (options.failureSummaryMessage != null) {
    queryFn = useAction(queryFn, options.failureSummaryMessage)
  }

  const ret = useVueInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: (ctx) => queryFn(ctx.pageParam, ctx.signal),
    initialPageParam: null as string | null,
    getNextPageParam: options.getNextPageToken
  })

  const isLoading = ret.isLoading
  const data = computed(() => ret.data.value?.pages ?? null)
  const error = ret.error as Ref<ActionException | null>
  const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })
  const refetch = () => ret.refetch()
  function fetchNextPage() {
    // Calling `fetchNextPage` of vue-query while fetching cancels and restarts the fetching,
    // so frequent calls (for example, on scrolling) may keep the next page from loading.
    if (!ret.hasNextPage.value || ret.isFetching.value) return
    ret.fetchNextPage()
  }
  return {
    isLoading,
    data,
    error,
    progress,
    refetch,
    hasNextPage: ret.hasNextPage,
    isFetchingNextPage: ret.isFetchingNextPage,
    fetchNextPage
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
  await until(() => !queryRet.isLoading.value, signal)
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
    // Collect `queryRet.isLoading` as dependency of current query.
    // This ensures that when sub-query re-fetches (maybe because of its own dependencies' change), the current query re-fetches too.
    toValue(queryRet.isLoading)
  }

  const collector = getCollector(ctx.reporter)
  const subReporter = collector.getSubReporter(...(subReportParams ?? []))
  const stopWatch = watch(queryRet.progress, (p) => subReporter.report(p), { immediate: true })
  ctx.signal.addEventListener('abort', () => stopWatch())

  return untilLoaded(queryRet, ctx.signal)
}
