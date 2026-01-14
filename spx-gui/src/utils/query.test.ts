import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { type ProgressHandler } from './progress'
import { useQuery, composeQuery, type QueryContext } from './query'
import { withSetup } from './test'
import { timeout } from './utils'

describe('useQuery', () => {
  it('should discard stale results when queryFn ignores abort signal', async () => {
    // This test simulates the race condition where queryFn ignores the abort signal
    let resolveFirst: (value: string) => void
    let resolveSecond: (value: string) => void

    const queryFn = vi.fn(async (ctx: QueryContext) => {
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

    const queryFn = vi.fn(async (ctx: QueryContext) => {
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
  })

  it('should handle multiple rapid refetches correctly', async () => {
    const results = ['first', 'second', 'third']
    const resolvers: Array<(value: string) => void> = []

    const queryFn = vi.fn(async (ctx: QueryContext) => {
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
    let report1!: ProgressHandler, report2!: ProgressHandler
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
