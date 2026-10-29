import { createApp, nextTick, ref, type App } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin, onlineManager } from '@tanstack/vue-query'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { type ProgressReportParams } from '../progress'
import {
  createResolvedQueryRet,
  untilLoaded,
  useQuery,
  composeQuery,
  useQueryWithCache,
  useQueryCache,
  type QueryContext,
  type QueryMode
} from './index'
import { withSetup } from '../test'
import { timeout } from '../utils'

describe('createResolvedQueryRet', () => {
  it('provides completed query state for existing data and keeps reactive data current', async () => {
    const data = ref('first')
    const queryRet = createResolvedQueryRet(data)
    expect(await untilLoaded(queryRet)).toBe('first')
    expect(queryRet.isLoading.value).toBe(false)
    expect(queryRet.error.value).toBeNull()
    expect(queryRet.progress.value.percentage).toBe(1)
    data.value = 'second'
    queryRet.refetch()
    expect(await untilLoaded(queryRet)).toBe('second')
    expect(await untilLoaded(createResolvedQueryRet(() => 'fixed'))).toBe('fixed')
  })
})

describe('useQuery', () => {
  it.each(['auto', 'refetch'] as const)('resets progress and ignores stale reports on %s fetch', async (source) => {
    const input = ref(0)
    const contexts: QueryContext[] = []
    const ret = withSetup(() =>
      useQuery(async (ctx) => {
        const value = input.value
        contexts.push(ctx)
        return value
      })
    )

    await flushPromises()
    contexts[0].reporter.report({ percentage: 0.8, timeLeft: 100, desc: { en: 'Loading', zh: '加载中' } })
    expect(ret.progress.value.percentage).toBe(0.8)

    if (source === 'auto') input.value++
    else ret.refetch()
    await flushPromises()
    expect(contexts[0].signal.aborted).toBe(true)
    expect(contexts[1].source).toBe(source)
    expect(ret.progress.value).toEqual({ percentage: 0, timeLeft: null, desc: null })

    contexts[1].reporter.report(0.2)
    contexts[0].reporter.report(1)
    expect(ret.progress.value.percentage).toBe(0.2)
  })

  it('keeps previous data during refetch by default', async () => {
    let resolveNext!: (value: string) => void
    let callCount = 0
    const ret = withSetup(() =>
      useQuery(async () => {
        if (++callCount === 1) return 'first'
        return new Promise<string>((resolve) => (resolveNext = resolve))
      })
    )

    await flushPromises()
    ret.refetch()
    expect(ret.data.value).toBe('first')

    resolveNext('second')
    await flushPromises()
    expect(ret.data.value).toBe('second')
  })

  it('clears previous data when clearResultOnFetch is enabled', async () => {
    let resolveNext!: (value: string) => void
    let callCount = 0
    const ret = withSetup(() =>
      useQuery(
        async () => {
          if (++callCount === 1) return 'first'
          return new Promise<string>((resolve) => (resolveNext = resolve))
        },
        { en: 'Failed to load data', zh: '加载数据失败' },
        { clearResultOnFetch: true }
      )
    )

    await flushPromises()
    ret.refetch()
    expect(ret.data.value).toBe(null)

    resolveNext('second')
    await flushPromises()
    expect(ret.data.value).toBe('second')
  })

  it.each([true, false])(
    'resets the previous error on retry only when clearResultOnFetch is %s',
    async (clearResultOnFetch) => {
      const error = new Error('failed')
      let finish!: (value: string) => void
      const query = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockImplementationOnce(() => new Promise<string>((resolve) => (finish = resolve)))
      const ret = withSetup(() => useQuery(query, undefined, { clearResultOnFetch }))
      await flushPromises()
      expect(ret.error.value).toBe(error)

      ret.refetch()
      expect(ret.isLoading.value).toBe(true)
      expect(ret.error.value).toBe(clearResultOnFetch ? null : error)
      finish('recovered')
      await flushPromises()
      expect(ret.data.value).toBe('recovered')
      expect(ret.error.value).toBeNull()
    }
  )

  it('does not collect reactive reads from the previous query cleanup', async () => {
    const queryInput = ref(1)
    const cleanupOnly = ref(0)
    const cleanup = vi.fn(() => cleanupOnly.value)
    const queryFn = vi.fn(async (ctx: QueryContext) => {
      const input = queryInput.value
      ctx.signal.addEventListener('abort', cleanup, { once: true })
      return input
    })
    const ret = withSetup(() => useQuery(queryFn))

    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(1)

    queryInput.value = 2
    await flushPromises()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(ret.data.value).toBe(2)

    cleanupOnly.value++
    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(ret.data.value).toBe(2)
  })

  it('aborts the failed query signal and allows refetch', async () => {
    const error = new Error('failed')
    const signals: AbortSignal[] = []
    const cleanup = vi.fn()
    const ret = withSetup(() =>
      useQuery(async (ctx) => {
        signals.push(ctx.signal)
        ctx.signal.addEventListener('abort', cleanup, { once: true })
        if (signals.length === 1) throw error
        return 'ok'
      })
    )

    await flushPromises()
    expect(ret.error.value).toBe(error)
    expect(signals[0].aborted).toBe(true)
    expect(cleanup).toHaveBeenCalledTimes(1)

    ret.refetch()
    await flushPromises()
    expect(ret.data.value).toBe('ok')
    expect(ret.error.value).toBe(null)
    expect(signals[1].aborted).toBe(false)
  })

  it('should discard stale results when queryFn ignores abort signal', async () => {
    // This test simulates the race condition where queryFn ignores the abort signal
    let resolveFirst: (value: string) => void
    let resolveSecond: (value: string) => void

    const queryFn = vi.fn(async () => {
      // Intentionally ignore the abort signal to simulate the issue
      return new Promise<string>((resolve) => {
        if (queryFn.mock.calls.length === 1) {
          resolveFirst = resolve
        } else {
          resolveSecond = resolve
        }
      })
    })

    const [ret] = withSetup(() => {
      const ret = useQuery(queryFn)
      return [ret] as const
    })

    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(ret.isLoading.value).toBe(true)

    // Trigger a second query before the first one completes
    ret.refetch()
    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(ret.isLoading.value).toBe(true)

    // Resolve the second query first (newer query)
    resolveSecond!('second')
    await flushPromises()
    expect(ret.data.value).toBe('second')
    expect(ret.isLoading.value).toBe(false)

    // Now resolve the first query (stale query) - it should be discarded
    resolveFirst!('first')
    await flushPromises()
    // The data should still be 'second', not 'first'
    expect(ret.data.value).toBe('second')
    expect(ret.isLoading.value).toBe(false)
  })

  it('should discard stale errors when queryFn ignores abort signal', async () => {
    let rejectFirst: (error: Error) => void
    let resolveSecond: (value: string) => void
    const signals: AbortSignal[] = []

    const queryFn = vi.fn(async (ctx: QueryContext) => {
      signals.push(ctx.signal)
      return new Promise<string>((resolve, reject) => {
        if (queryFn.mock.calls.length === 1) {
          rejectFirst = reject
        } else {
          resolveSecond = resolve
        }
      })
    })

    const [ret] = withSetup(() => {
      const ret = useQuery(queryFn)
      return [ret] as const
    })

    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Trigger a second query
    ret.refetch()
    await flushPromises()
    expect(queryFn).toHaveBeenCalledTimes(2)

    // Resolve the second query with success
    resolveSecond!('success')
    await flushPromises()
    expect(ret.data.value).toBe('success')
    expect(ret.error.value).toBe(null)
    expect(ret.isLoading.value).toBe(false)

    // Reject the first query with an error - it should be discarded
    const staleError = new Error('stale error')
    rejectFirst!(staleError)
    await flushPromises()
    // The error should not be set, data should still be 'success'
    expect(ret.data.value).toBe('success')
    expect(ret.error.value).toBe(null)
    expect(ret.isLoading.value).toBe(false)
    expect(signals[1].aborted).toBe(false)
  })

  it('should handle multiple rapid refetches correctly', async () => {
    const results = ['first', 'second', 'third']
    const resolvers: Array<(value: string) => void> = []

    const queryFn = vi.fn(async () => {
      return new Promise<string>((resolve) => {
        resolvers.push(resolve)
      })
    })

    const [ret] = withSetup(() => {
      const ret = useQuery(queryFn)
      return [ret] as const
    })

    await flushPromises()

    // Trigger two more queries rapidly
    ret.refetch()
    await flushPromises()
    ret.refetch()
    await flushPromises()

    expect(queryFn).toHaveBeenCalledTimes(3)
    expect(ret.isLoading.value).toBe(true)

    // Resolve in reverse order: third, first, second
    resolvers[2]!(results[2])
    await flushPromises()
    expect(ret.data.value).toBe('third')
    expect(ret.isLoading.value).toBe(false)

    resolvers[0]!(results[0])
    await flushPromises()
    expect(ret.data.value).toBe('third') // Should still be 'third'

    resolvers[1]!(results[1])
    await flushPromises()
    expect(ret.data.value).toBe('third') // Should still be 'third'
  })
})

describe('composeQuery', () => {
  it('should work well', async () => {
    const valueRef = ref(0)
    const [queryFn1, ret1, queryFn2, ret2] = withSetup(() => {
      const queryFn1 = vi.fn(async () => valueRef.value)
      const ret1 = useQuery(queryFn1)
      const queryFn2 = vi.fn(async (ctx: QueryContext) => composeQuery(ctx, ret1))
      const ret2 = useQuery(queryFn2)
      return [queryFn1, ret1, queryFn2, ret2] as const
    })
    expect(ret2.isLoading.value).toBe(true)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(null)

    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(0)
    expect(ret2.error.value).toBe(null)
    expect(queryFn1).toHaveBeenCalledTimes(1)
    expect(queryFn2).toHaveBeenCalledTimes(2)

    valueRef.value++
    await flushPromises()
    expect(ret1.isLoading.value).toBe(false)
    expect(ret1.data.value).toBe(1)
    expect(ret1.error.value).toBe(null)
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(1)
    expect(ret2.error.value).toBe(null)
    expect(queryFn1).toHaveBeenCalledTimes(2)
    expect(queryFn2).toHaveBeenCalledTimes(4)

    ret1.refetch()
    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(1)
    expect(ret2.error.value).toBe(null)
    expect(queryFn1).toHaveBeenCalledTimes(3)
    expect(queryFn2).toHaveBeenCalledTimes(6)

    ret2.refetch()
    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(1)
    expect(ret2.error.value).toBe(null)
    expect(queryFn1).toHaveBeenCalledTimes(4)
    expect(queryFn2).toHaveBeenCalledTimes(9)
  })

  function makeErrorFn(times: number, err: unknown) {
    return async (ctx: QueryContext) => {
      await timeout(50)
      ctx.signal.throwIfAborted()
      times--
      if (times >= 0) throw err
      return 'ok'
    }
  }

  it('should work well with exception', async () => {
    const err = new Error('test')
    const errFn = vi.fn(makeErrorFn(3, err))
    const [ret1, ret2] = withSetup(() => {
      const ret1 = useQuery(errFn)
      const ret2 = useQuery(async (ctx: QueryContext) => composeQuery(ctx, ret1))
      return [ret1, ret2] as const
    })

    await timeout(100)
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)
    expect(errFn).toHaveBeenCalledTimes(1)

    ret2.refetch()
    await timeout(100)
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)
    expect(errFn).toHaveBeenCalledTimes(2)

    ret1.refetch()
    await timeout(100)
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)
    expect(errFn).toHaveBeenCalledTimes(3)

    ret2.refetch()
    await timeout(100)
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe('ok')
    expect(ret2.error.value).toBe(null)
    expect(errFn).toHaveBeenCalledTimes(4)
  })

  it('should work well with multiple dependencies', async () => {
    const err1 = new Error('test1')
    const err2 = new Error('test2')
    const ret3 = withSetup(() => {
      const ret1 = useQuery(makeErrorFn(1, err1))
      const ret2 = useQuery(makeErrorFn(2, err2))
      const ret3 = useQuery(async (ctx: QueryContext) =>
        Promise.all([composeQuery(ctx, ret1), composeQuery(ctx, ret2)])
      )
      return ret3
    })

    await timeout(100)
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toBe(null)
    expect(ret3.error.value).toBe(err1)

    ret3.refetch()
    await timeout(100)
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toBe(null)
    expect(ret3.error.value).toBe(err2)

    ret3.refetch()
    await timeout(100)
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toEqual(['ok', 'ok'])
    expect(ret3.error.value).toBe(null)
  })

  it('should work well with progress', async () => {
    let report1!: (p: ProgressReportParams) => void, report2!: (p: ProgressReportParams) => void
    let resolve1!: () => void, resolve2!: () => void
    const [ret1, ret2, ret3] = withSetup(() => {
      const ret1 = useQuery(async (ctx: QueryContext) => {
        report1 = (p) => ctx.reporter.report(p)
        await new Promise<void>((r) => (resolve1 = r))
      })
      const ret2 = useQuery(async (ctx: QueryContext) => {
        report2 = (p) => ctx.reporter.report(p)
        await new Promise<void>((r) => (resolve2 = r))
      })
      const ret3 = useQuery(async (ctx: QueryContext) => {
        await Promise.all([
          composeQuery(ctx, ret1, [{ en: '1', zh: '1' }, 1]),
          composeQuery(ctx, ret2, [{ en: '2', zh: '2' }, 3])
        ])
      })
      return [ret1, ret2, ret3] as const
    })

    report1({ percentage: 0.4, desc: null })
    await nextTick()
    expect(ret1.progress.value.percentage).toBeCloseTo(0.4)
    expect(ret2.progress.value.percentage).toBeCloseTo(0)
    expect(ret3.progress.value.percentage).toBeCloseTo(0.1)
    expect(ret3.progress.value.desc).toEqual({ en: '1', zh: '1' })

    report2({ percentage: 0.8, desc: null })
    await nextTick()
    expect(ret1.progress.value.percentage).toBeCloseTo(0.4)
    expect(ret2.progress.value.percentage).toBeCloseTo(0.8)
    expect(ret3.progress.value.percentage).toBeCloseTo(0.7)
    expect(ret3.progress.value.desc).toEqual({ en: '1', zh: '1' })

    report1({ percentage: 1, desc: null })
    resolve1()
    await nextTick()
    expect(ret1.progress.value.percentage).toBeCloseTo(1)
    expect(ret2.progress.value.percentage).toBeCloseTo(0.8)
    expect(ret3.progress.value.percentage).toBeCloseTo(0.85)
    expect(ret3.progress.value.desc).toEqual({ en: '2', zh: '2' })

    report2({ percentage: 1, desc: null })
    resolve2()
    await nextTick()
    expect(ret1.progress.value.percentage).toBeCloseTo(1)
    expect(ret2.progress.value.percentage).toBeCloseTo(1)
    expect(ret3.progress.value.percentage).toBeCloseTo(1)
    expect(ret3.progress.value.desc).toBeNull()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const apps: App[] = []
const clients: QueryClient[] = []
function client() {
  const result = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } }
  })
  clients.push(result)
  return result
}
function setup<T>(queryClient: QueryClient, fn: () => T) {
  let result!: T
  const app = createApp({
    setup: () => {
      result = fn()
      return () => null
    }
  })
  app.use(VueQueryPlugin, { queryClient })
  app.mount(document.createElement('div'))
  apps.push(app)
  return result
}
function state(query: ReturnType<typeof useQueryWithCache>) {
  return { data: query.data.value, error: query.error.value, loading: query.isLoading.value }
}

afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount())
  clients.splice(0).forEach((queryClient) => queryClient.clear())
  onlineManager.setOnline(true)
})

describe('cached query refreshing modes', () => {
  it('defaults to live while revalidating expired data, including on failure', async () => {
    const queryClient = client()
    queryClient.setQueryData(['default'], 'old')
    const pending = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['default'], queryFn: () => pending.promise, staleTime: 0 })
    )
    expect(state(query)).toEqual({ data: 'old', error: null, loading: false })
    const error = new Error('refresh failed')
    pending.reject(error)
    await flushPromises()
    expect(state(query)).toEqual({ data: 'old', error, loading: false })
  })

  it('blocks an explicit snapshot refetch while offline without affecting live data', async () => {
    const queryClient = client()
    queryClient.setQueryData(['offline-refetch'], 'old')
    const [snapshot, live] = setup(queryClient, () =>
      (['snapshot', 'live'] as const).map((mode) =>
        useQueryWithCache({ queryKey: ['offline-refetch'], queryFn: async () => 'new', staleTime: Infinity, mode })
      )
    )
    onlineManager.setOnline(false)
    snapshot.refetch()
    expect(state(snapshot)).toEqual({ data: null, error: null, loading: true })
    expect(state(live)).toEqual({ data: 'old', error: null, loading: false })
    onlineManager.setOnline(true)
    await flushPromises()
    expect(state(snapshot)).toEqual({ data: 'new', error: null, loading: false })
    expect(live.data.value).toBe('new')
    queryClient.removeQueries({ queryKey: ['offline-refetch'] })
    queryClient.setQueryData(['offline-refetch'], 'replacement')
    expect(snapshot.data.value).toBe('new')
  })

  it('keeps live compatible and isolates snapshots on the same key', async () => {
    const queryClient = client()
    queryClient.setQueryData(['shared'], 'cached')
    let pending = deferred<string>()
    const queryFn = () => pending.promise
    const queries = setup(queryClient, () =>
      Object.fromEntries(
        (['live', 'snapshot'] as const).map((mode) => [
          mode,
          useQueryWithCache({ staleTime: Infinity, queryKey: ['shared'], queryFn, mode })
        ])
      )
    )
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    const refresh = queryClient.invalidateQueries({ queryKey: ['shared'] })
    await vi.waitFor(() => expect(queryClient.isFetching({ queryKey: ['shared'] })).toBe(1))
    expect(state(queries.live)).toEqual({ data: 'cached', error: null, loading: false })
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    pending.resolve('new')
    await refresh
    expect(queries.live.data.value).toBe('new')
    expect(queries.snapshot.data.value).toBe('cached')

    pending = deferred<string>()
    const failedRefresh = queryClient.invalidateQueries({ queryKey: ['shared'] })
    await vi.waitFor(() => expect(queryClient.isFetching({ queryKey: ['shared'] })).toBe(1))
    const error = new Error('offline')
    pending.reject(error)
    await failedRefresh
    expect(state(queries.live)).toEqual({ data: 'new', error, loading: false })
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    queryClient.setQueryData(['shared'], 'direct update')
    expect(queries.live.data.value).toBe('direct update')
    expect(queries.snapshot.data.value).toBe('cached')
    await queryClient.invalidateQueries({ queryKey: ['shared'], refetchType: 'none' })
    expect(queries.snapshot.data.value).toBe('cached')
  })

  it('loads cold, fresh, expired and invalidated caches in snapshot mode', async () => {
    for (const cacheState of ['cold', 'fresh', 'expired', 'invalidated']) {
      const queryClient = client()
      const queryKey = [cacheState]
      if (cacheState !== 'cold')
        queryClient.setQueryData(queryKey, 'old', { updatedAt: cacheState === 'expired' ? 1 : Date.now() })
      if (cacheState === 'invalidated') await queryClient.invalidateQueries({ queryKey })
      const pending = deferred<string>()
      const queryFn = vi.fn(() => pending.promise)
      const query = setup(queryClient, () =>
        useQueryWithCache({ queryKey, queryFn, mode: 'snapshot', staleTime: 10000 })
      )
      if (cacheState === 'fresh') {
        expect(state(query)).toEqual({ data: 'old', error: null, loading: false })
        expect(queryFn).not.toHaveBeenCalled()
      } else {
        expect(state(query)).toEqual({ data: null, error: null, loading: true })
        pending.resolve('valid')
        await flushPromises()
        expect(state(query)).toEqual({ data: 'valid', error: null, loading: false })
      }
    }
  })

  it.each([null, false, [], 0, ''])('captures successful %j even with staleTime zero', async (value) => {
    const queryClient = client()
    const query = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['empty'], queryFn: async () => value, mode: 'snapshot', staleTime: 0 })
    )
    await flushPromises()
    expect(state(query)).toEqual({ data: value, error: null, loading: false })
    queryClient.setQueryData(['empty'], 'other')
    expect(query.data.value).toEqual(value)
  })

  it('clears the snapshot during explicit refetch and retries failed reads', async () => {
    const queryClient = client()
    queryClient.setQueryData(['retry'], 'old')
    let pending = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({ staleTime: Infinity, queryKey: ['retry'], queryFn: () => pending.promise, mode: 'snapshot' })
    )
    query.refetch()
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    const error = new Error('failed')
    pending.reject(error)
    await flushPromises()
    expect(state(query)).toEqual({ data: null, error, loading: false })
    await expect(untilLoaded(query)).rejects.toBe(error)
    pending = deferred<string>()
    query.refetch()
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    pending.resolve('recovered')
    await expect(untilLoaded(query)).resolves.toBe('recovered')
    queryClient.setQueryData(['retry'], 'updated')
    expect(query.data.value).toBe('recovered')
  })

  it('resets snapshot on key changes, ignores late results and can revisit a previous key', async () => {
    const queryClient = client()
    const key = ref('a')
    const a = deferred<string>(),
      b = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({
        staleTime: Infinity,
        queryKey: () => [key.value],
        queryFn: () => (key.value === 'a' ? a.promise : b.promise),
        mode: 'snapshot'
      })
    )
    key.value = 'b'
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    await nextTick()
    a.resolve('late a')
    b.resolve('b')
    await flushPromises()
    expect(query.data.value).toBe('b')
    queryClient.setQueryData(['a'], 'fresh a')
    key.value = 'a'
    expect(query.data.value).toBe('fresh a')
    await nextTick()
    expect(query.data.value).toBe('fresh a')
  })

  it('waits for a paused snapshot read', async () => {
    const queryClient = client()
    queryClient.setQueryData(['paused'], 'old')
    await queryClient.invalidateQueries({ queryKey: ['paused'] })
    onlineManager.setOnline(false)
    const queryFn = vi.fn(async () => 'online')
    const query = setup(queryClient, () =>
      useQueryWithCache({ staleTime: Infinity, queryKey: ['paused'], queryFn, mode: 'snapshot' })
    )
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    expect(queryFn).not.toHaveBeenCalled()
    onlineManager.setOnline(true)
    await flushPromises()
    expect(state(query)).toEqual({ data: 'online', error: null, loading: false })
  })

  it('does not accept canceled stale data as a required result and permits retry', async () => {
    const queryClient = client()
    queryClient.setQueryData(['cancel'], 'old')
    const pending = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['cancel'], queryFn: () => pending.promise, mode: 'snapshot', staleTime: 0 })
    )
    await queryClient.cancelQueries({ queryKey: ['cancel'] })
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    pending.resolve('retried')
    query.refetch()
    await flushPromises()
    expect(query.data.value).toBe('retried')
  })

  it('captures the replacement request when invalidation cancels its initial read', async () => {
    const queryClient = client()
    queryClient.setQueryData(['replacement'], 'stale')
    const previous = deferred<string>()
    const replacement = deferred<string>()
    const queryFn = vi.fn().mockReturnValueOnce(previous.promise).mockReturnValue(replacement.promise)
    const { query, cache } = setup(queryClient, () => ({
      query: useQueryWithCache({ queryKey: ['replacement'], queryFn, mode: 'snapshot', staleTime: 0 }),
      cache: useQueryCache()
    }))
    const refreshing = cache.invalidate(['replacement'])
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))
    previous.resolve('old response')
    await flushPromises()
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    replacement.resolve('current')
    await refreshing
    await expect(untilLoaded(query)).resolves.toBe('current')
  })

  it('keeps the shared request running when only the snapshot consumer unmounts', async () => {
    const queryClient = client()
    const pending = deferred<string>()
    let signal!: AbortSignal
    const queryFn = vi.fn((s: AbortSignal) => {
      signal = s
      return pending.promise
    })
    const live = setup(queryClient, () => useQueryWithCache({ queryKey: ['shared-unmount'], queryFn }))
    const snapshot = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['shared-unmount'], queryFn, mode: 'snapshot' })
    )
    apps.pop()!.unmount()
    expect(signal.aborted).toBe(false)
    pending.resolve('shared result')
    await flushPromises()
    expect(live.data.value).toBe('shared result')
    expect(snapshot.isLoading.value).toBe(true)
    expect(queryFn).toHaveBeenCalledOnce()
  })

  it('waits again if explicit refetch interleaves with untilLoaded readiness', async () => {
    const queryClient = client()
    queryClient.setQueryData(['race'], 'old')
    const pending = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({
        staleTime: Infinity,
        queryKey: ['race'],
        queryFn: () => pending.promise,
        mode: 'snapshot'
      })
    )
    let completed = false
    const read = untilLoaded(query).then((value) => {
      completed = true
      return value
    })
    query.refetch()
    await flushPromises()
    expect(completed).toBe(false)
    pending.resolve('current')
    await expect(read).resolves.toBe('current')
  })

  it('aborts waiting reads and releases its subscription on unmount', async () => {
    const queryClient = client()
    const pending = deferred<string>()
    let signal!: AbortSignal
    const query = setup(queryClient, () =>
      useQueryWithCache({
        staleTime: Infinity,
        queryKey: ['unmount'],
        queryFn: (s) => {
          signal = s
          return pending.promise
        },
        mode: 'snapshot'
      })
    )
    const ctrl = new AbortController()
    const read = untilLoaded(query, ctrl.signal)
    const reason = new Error('aborted')
    ctrl.abort(reason)
    await expect(read).rejects.toBe(reason)
    apps.pop()!.unmount()
    expect(signal.aborted).toBe(true)
    queryClient.setQueryData(['unmount'], 'after unmount')
    expect(query.isLoading.value).toBe(true)
  })

  it.each(['live', 'snapshot'] as QueryMode[])('composes observable %s results', async (mode) => {
    const queryClient = client()
    queryClient.setQueryData(['composed'], 'old')
    const [query, composed] = setup(queryClient, () => {
      const query = useQueryWithCache({
        staleTime: Infinity,
        queryKey: ['composed'],
        queryFn: async () => 'fetched',
        mode
      })
      const composed = useQuery((ctx) => composeQuery(ctx, query))
      return [query, composed] as const
    })
    await flushPromises()
    queryClient.setQueryData(['composed'], 'updated')
    await flushPromises()
    expect(composed.data.value).toBe(mode === 'snapshot' ? 'old' : 'updated')
    composed.refetch()
    await flushPromises()
    expect(query.data.value).toBe('fetched')
    expect(composed.data.value).toBe('fetched')
  })
})

describe('cache writes', () => {
  it('creates and invalidates only the exact entry without canceling a child query', async () => {
    const queryClient = client()
    queryClient.setQueryData(['item', 'child'], 'old child')
    const pending = deferred<string>()
    const childRead = queryClient.fetchQuery({
      queryKey: ['item', 'child'],
      queryFn: () => pending.promise,
      staleTime: 0
    })
    const cache = setup(queryClient, () => useQueryCache())
    await cache.invalidateWithOptimisticValue(['item'], 'saved')
    expect(queryClient.getQueryData(['item'])).toBe('saved')
    expect(queryClient.getQueryState(['item'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['item', 'child'])?.isInvalidated).toBe(false)
    pending.resolve('new child')
    await expect(childRead).resolves.toBe('new child')
  })

  it('updates matching existing results immediately and revalidates them without creating missing lists', async () => {
    const queryClient = client()
    queryClient.setQueryData(['list', 'a'], [1])
    queryClient.setQueryData(['list', 'b'], [2])
    queryClient.setQueryData(['other'], [9])
    queryClient.setQueryData(['list', 'null'], null)
    queryClient.getQueryCache().build(queryClient, { queryKey: ['list', 'empty'] })
    const pending = deferred<number[]>()
    const oldRead = queryClient
      .fetchQuery({ queryKey: ['list', 'a'], queryFn: () => pending.promise, staleTime: 0 })
      .catch(() => null)
    const cache = setup(queryClient, () => useQueryCache())
    const updater = vi.fn((values: number[]) => [...values, 3])
    const writing = cache.invalidateMatchingWithOptimisticUpdater(['list'], updater)
    expect(queryClient.getQueryData(['list', 'a'])).toEqual([1, 3])
    expect(queryClient.getQueryData(['list', 'b'])).toEqual([2, 3])
    expect(queryClient.getQueryState(['list', 'a'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['list', 'b'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData(['list', 'empty'])).toBeUndefined()
    expect(queryClient.getQueryData(['list', 'null'])).toBeNull()
    expect(queryClient.getQueryData(['list'])).toBeUndefined()
    expect(queryClient.getQueryData(['other'])).toEqual([9])
    expect(updater).toHaveBeenCalledTimes(2)
    await writing
    pending.resolve([0])
    await oldRead
    expect(queryClient.getQueryData(['list', 'a'])).toEqual([1, 3])
  })

  it('keeps a confirmed write when an earlier GET completes late', async () => {
    const queryClient = client()
    const pending = deferred<string>()
    const oldRead = queryClient.fetchQuery({ queryKey: ['item'], queryFn: () => pending.promise }).catch(() => null)
    const cache = setup(queryClient, () => useQueryCache())
    await cache.invalidateWithOptimisticValue(['item'], 'saved')
    pending.resolve('old')
    await oldRead
    await flushPromises()
    expect(queryClient.getQueryData(['item'])).toBe('saved')
    expect(queryClient.getQueryState(['item'])?.isInvalidated).toBe(true)
  })

  it('marks invalidation before a newly mounted snapshot can capture the old list', async () => {
    const queryClient = client()
    queryClient.setQueryData(['list'], 'old')
    const pending = deferred<string>()
    const queryFn = vi.fn(() => pending.promise)
    const { live, cache } = setup(queryClient, () => ({
      live: useQueryWithCache({ queryKey: ['list'], queryFn, staleTime: Infinity }),
      cache: useQueryCache()
    }))
    const refresh = cache.invalidate(['list'])
    const snapshot = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['list'], queryFn, staleTime: Infinity, mode: 'snapshot' })
    )
    expect(live.data.value).toBe('old')
    expect(snapshot.isLoading.value).toBe(true)
    expect(snapshot.data.value).toBeNull()
    pending.resolve('new')
    await refresh
    await expect(untilLoaded(snapshot)).resolves.toBe('new')
    expect(live.data.value).toBe('new')
    expect(queryFn).toHaveBeenCalledOnce()
  })
})
