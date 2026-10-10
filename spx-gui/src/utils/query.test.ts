import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { QueryClient } from '@tanstack/vue-query'
import { describe, it, expect, vi } from 'vitest'
import { type ProgressReportParams } from './progress'
import { useQuery, composeQuery, useQueryCache, useQueryWithCache, type QueryContext } from './query'
import { withQueryClient, withSetup } from './test'
import { timeout } from './utils'

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

  it('clears previous data when clearDataOnFetch is enabled', async () => {
    let resolveNext!: (value: string) => void
    let callCount = 0
    const ret = withSetup(() =>
      useQuery(
        async () => {
          if (++callCount === 1) return 'first'
          return new Promise<string>((resolve) => (resolveNext = resolve))
        },
        { en: 'Failed to load data', zh: '加载数据失败' },
        { clearDataOnFetch: true }
      )
    )

    await flushPromises()
    ret.refetch()
    expect(ret.data.value).toBe(null)

    resolveNext('second')
    await flushPromises()
    expect(ret.data.value).toBe('second')
  })

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

describe('useQueryCache', () => {
  function makeQueryClient() {
    // No garbage collection: whatever leaves the cache here is removed by the code under test.
    return new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  }

  it('updates the data of every query under a key, skipping queries with no data', () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(['list', '1'], [1])
    queryClient.setQueryData(['list', '2'], [2])
    queryClient.setQueryData(['other'], [9])
    queryClient.getQueryCache().build(queryClient, { queryKey: ['list', '3'] })
    const cache = withQueryClient(queryClient, () => useQueryCache<number[]>())
    const updater = vi.fn((data: number[]) => [...data, 0])

    cache.update(['list'], updater)

    expect(queryClient.getQueryData(['list', '1'])).toEqual([1, 0])
    expect(queryClient.getQueryData(['list', '2'])).toEqual([2, 0])
    expect(queryClient.getQueryData(['other'])).toEqual([9])
    expect(updater).toHaveBeenCalledTimes(2)
  })

  it('discards data nobody is reading, so the next reader waits for fresh data', async () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(['item'], 'outdated')
    const cache = withQueryClient(queryClient, () => useQueryCache())

    await cache.discard(['item'])

    const ret = withQueryClient(queryClient, () =>
      useQueryWithCache({ queryKey: ['item'], queryFn: async () => 'fresh' })
    )
    expect(ret.isLoading.value).toBe(true)
    expect(ret.data.value).toBeNull()
    await flushPromises()
    expect(ret.data.value).toBe('fresh')
  })

  it('refetches data a reader is showing, which keeps it until the fresh data arrives', async () => {
    const queryClient = makeQueryClient()
    let resolveFresh!: (value: string) => void
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce('outdated')
      .mockReturnValueOnce(new Promise<string>((resolve) => (resolveFresh = resolve)))
    const ret = withQueryClient(queryClient, () => useQueryWithCache({ queryKey: ['item'], queryFn }))
    await flushPromises()
    const cache = withQueryClient(queryClient, () => useQueryCache())

    void cache.discard(['item'])
    // `vue-query` starts the refetch on the next macrotask.
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))

    expect(ret.isLoading.value).toBe(false)
    expect(ret.data.value).toBe('outdated')
    resolveFresh('fresh')
    await vi.waitFor(() => expect(ret.data.value).toBe('fresh'))
  })
})
