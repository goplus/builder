import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { useQuery, composeQuery, type QueryContext } from './query'

describe('composeQuery', () => {
  it('should work well', async () => {
    const valueRef = ref(0)
    const queryFn1 = vi.fn(async () => valueRef.value)
    const ret1 = useQuery(queryFn1)
    const queryFn2 = vi.fn(async (ctx: QueryContext) => composeQuery(ctx, ret1))
    const ret2 = useQuery(queryFn2)
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
    return async () => {
      times--
      if (times >= 0) throw err
      return 'ok'
    }
  }

  it('should work well with exception', async () => {
    const err = new Error('test')
    const ret1 = useQuery(makeErrorFn(3, err))
    const ret2 = useQuery(async (ctx: QueryContext) => composeQuery(ctx, ret1))

    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)

    ret2.refetch()
    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)

    ret1.refetch()
    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe(null)
    expect(ret2.error.value).toBe(err)

    ret2.refetch()
    await flushPromises()
    expect(ret2.isLoading.value).toBe(false)
    expect(ret2.data.value).toBe('ok')
    expect(ret2.error.value).toBe(null)
  })

  it('should work well with multiple dependencies', async () => {
    const err1 = new Error('test1')
    const err2 = new Error('test2')
    const ret1 = useQuery(makeErrorFn(1, err1))
    const ret2 = useQuery(makeErrorFn(2, err2))
    const ret3 = useQuery(async (ctx: QueryContext) => Promise.all([composeQuery(ctx, ret1), composeQuery(ctx, ret2)]))

    await flushPromises()
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toBe(null)
    expect(ret3.error.value).toBe(err1)

    ret3.refetch()
    await flushPromises()
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toBe(null)
    expect(ret3.error.value).toBe(err2)

    ret3.refetch()
    await flushPromises()
    expect(ret3.isLoading.value).toBe(false)
    expect(ret3.data.value).toEqual(['ok', 'ok'])
    expect(ret3.error.value).toBe(null)
  })
})
