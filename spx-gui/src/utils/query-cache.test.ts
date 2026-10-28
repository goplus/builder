import { createApp, nextTick, ref, type App } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin, onlineManager } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeQuery, untilLoaded, useQuery, useQueryWithCache, type QueryMode } from './query'

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
  it('defaults to background while revalidating expired data, including on failure', async () => {
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

  it('publishes blocking successes with zero staleTime, then hides explicitly invalidated data', async () => {
    const queryClient = client()
    const query = setup(queryClient, () =>
      useQueryWithCache({ queryKey: ['zero'], queryFn: async () => 'valid', staleTime: 0, mode: 'blocking' })
    )
    await flushPromises()
    expect(state(query)).toEqual({ data: 'valid', error: null, loading: false })
    await queryClient.invalidateQueries({ queryKey: ['zero'], refetchType: 'none' })
    expect(state(query)).toEqual({ data: null, error: null, loading: true })
    query.refetch()
    await flushPromises()
    expect(state(query)).toEqual({ data: 'valid', error: null, loading: false })
  })

  it('blocks an explicit snapshot refetch while offline without affecting background data', async () => {
    const queryClient = client()
    queryClient.setQueryData(['offline-refetch'], 'old')
    const [snapshot, background] = setup(queryClient, () =>
      (['snapshot', 'background'] as const).map((mode) =>
        useQueryWithCache({ queryKey: ['offline-refetch'], queryFn: async () => 'new', staleTime: Infinity, mode })
      )
    )
    onlineManager.setOnline(false)
    snapshot.refetch()
    expect(state(snapshot)).toEqual({ data: null, error: null, loading: true })
    expect(state(background)).toEqual({ data: 'old', error: null, loading: false })
    onlineManager.setOnline(true)
    await flushPromises()
    expect(state(snapshot)).toEqual({ data: 'new', error: null, loading: false })
    expect(background.data.value).toBe('new')
    queryClient.removeQueries({ queryKey: ['offline-refetch'] })
    queryClient.setQueryData(['offline-refetch'], 'replacement')
    expect(snapshot.data.value).toBe('new')
  })

  it('keeps background compatible and isolates blocking and snapshot on the same key', async () => {
    const queryClient = client()
    queryClient.setQueryData(['shared'], 'cached')
    let pending = deferred<string>()
    const queryFn = () => pending.promise
    const queries = setup(queryClient, () =>
      Object.fromEntries(
        (['background', 'blocking', 'snapshot'] as const).map((mode) => [
          mode,
          useQueryWithCache({ staleTime: Infinity, queryKey: ['shared'], queryFn, mode })
        ])
      )
    )
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    const refresh = queryClient.invalidateQueries({ queryKey: ['shared'] })
    await vi.waitFor(() => expect(queries.blocking.isLoading.value).toBe(true))
    expect(state(queries.background)).toEqual({ data: 'cached', error: null, loading: false })
    expect(state(queries.blocking)).toEqual({ data: null, error: null, loading: true })
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    pending.resolve('new')
    await refresh
    expect(queries.background.data.value).toBe('new')
    expect(queries.blocking.data.value).toBe('new')
    expect(queries.snapshot.data.value).toBe('cached')

    pending = deferred<string>()
    const failedRefresh = queryClient.invalidateQueries({ queryKey: ['shared'] })
    await vi.waitFor(() => expect(queries.blocking.isLoading.value).toBe(true))
    const error = new Error('offline')
    pending.reject(error)
    await failedRefresh
    expect(state(queries.background)).toEqual({ data: 'new', error, loading: false })
    expect(state(queries.blocking)).toEqual({ data: null, error, loading: false })
    expect(state(queries.snapshot)).toEqual({ data: 'cached', error: null, loading: false })
    queryClient.setQueryData(['shared'], 'direct update')
    expect(queries.background.data.value).toBe('direct update')
    expect(queries.snapshot.data.value).toBe('cached')
    await queryClient.invalidateQueries({ queryKey: ['shared'], refetchType: 'none' })
    expect(queries.blocking.isLoading.value).toBe(true)
    expect(queries.snapshot.data.value).toBe('cached')
  })

  it.each(['blocking', 'snapshot'] as const)(
    'loads cold, fresh, expired and invalidated caches in %s mode',
    async (mode) => {
      for (const cacheState of ['cold', 'fresh', 'expired', 'invalidated']) {
        const queryClient = client()
        const queryKey = [cacheState]
        if (cacheState !== 'cold')
          queryClient.setQueryData(queryKey, 'old', { updatedAt: cacheState === 'expired' ? 1 : Date.now() })
        if (cacheState === 'invalidated') await queryClient.invalidateQueries({ queryKey })
        const pending = deferred<string>()
        const queryFn = vi.fn(() => pending.promise)
        const query = setup(queryClient, () => useQueryWithCache({ queryKey, queryFn, mode, staleTime: 10000 }))
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
    }
  )

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

  it.each(['blocking', 'snapshot'] as const)(
    'explicitly refetches and retries with blocking state in %s mode',
    async (mode) => {
      const queryClient = client()
      queryClient.setQueryData(['retry'], 'old')
      let pending = deferred<string>()
      const query = setup(queryClient, () =>
        useQueryWithCache({ staleTime: Infinity, queryKey: ['retry'], queryFn: () => pending.promise, mode })
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
      expect(query.data.value).toBe(mode === 'snapshot' ? 'recovered' : 'updated')
    }
  )

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

  it.each(['blocking', 'snapshot'] as const)('waits for a paused required result in %s mode', async (mode) => {
    const queryClient = client()
    queryClient.setQueryData(['paused'], 'old')
    await queryClient.invalidateQueries({ queryKey: ['paused'] })
    onlineManager.setOnline(false)
    const queryFn = vi.fn(async () => 'online')
    const query = setup(queryClient, () =>
      useQueryWithCache({ staleTime: Infinity, queryKey: ['paused'], queryFn, mode })
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

  it('waits again if invalidation interleaves with untilLoaded readiness', async () => {
    const queryClient = client()
    queryClient.setQueryData(['race'], 'old')
    const pending = deferred<string>()
    const query = setup(queryClient, () =>
      useQueryWithCache({
        staleTime: Infinity,
        queryKey: ['race'],
        queryFn: () => pending.promise,
        mode: 'blocking'
      })
    )
    let completed = false
    const read = untilLoaded(query).then((value) => {
      completed = true
      return value
    })
    queryClient
      .getQueryCache()
      .find({ queryKey: ['race'] })!
      .invalidate()
    void queryClient.refetchQueries({ queryKey: ['race'] })
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

  it.each(['background', 'blocking', 'snapshot'] as QueryMode[])('composes observable %s results', async (mode) => {
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
