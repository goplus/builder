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
  const progress = shallowRef<Progress>({ percentage: 0, desc: null })

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
    const reporter = new ProgressReporter((p) => (progress.value = p))
    isLoading.value = true
    queryFn({ signal, source, reporter }).then(
      (d) => {
        data.value = d
        error.value = null
        isLoading.value = false
      },
      (e) => {
        if (e instanceof Cancelled) return
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
  const progress = shallowRef<Progress>({ percentage: 0, desc: null })
  const refetch = () => ret.refetch()
  return { isLoading, data, error, progress, refetch }
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

  return new Promise<T>((resolve, reject) => {
    until(() => !queryRet.isLoading.value, ctx.signal).then(() => {
      if (queryRet.error.value != null) reject(queryRet.error.value)
      else resolve(queryRet.data.value!)
    })
  })
}
