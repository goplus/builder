import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import * as apis from '@/apis/project'
import { makeSignedInMock, makeSignedInState, makeSignedInStateQuery } from './user/test'
import { useIsLikingProject } from './liking'

let auth: ReturnType<typeof makeSignedInStateQuery>
let localUsername = ref<string | null>('alice')
let queryClient: QueryClient
vi.mock('./user', () => ({ useSignedIn: () => makeSignedInMock(auth, localUsername) }))
enableAutoUnmount(afterEach)

function setup() {
  let result!: ReturnType<typeof useIsLikingProject>
  mount(
    defineComponent({
      setup() {
        result = useIsLikingProject(() => ({ owner: 'bob', name: 'Space' }))
        return () => null
      }
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
  )
  return result
}

describe('useIsLikingProject authentication', () => {
  beforeEach(() => {
    auth = makeSignedInStateQuery(null)
    localUsername = ref<string | null>('alice')
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(apis, 'isLiking').mockResolvedValue(true)
  })
  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it('uses the local username to isolate its query from cached guest results', async () => {
    queryClient.setQueryData(['liking', null, 'bob', 'Space'], false)
    const result = setup()
    await flushPromises()
    expect(result.isLoading.value).toBe(true)
    expect(result.data.value).toBeNull()
    expect(apis.isLiking).not.toHaveBeenCalled()
    auth.data.value = makeSignedInState('alice')
    auth.isLoading.value = false
    await flushPromises()
    expect(result.data.value).toBe(true)
    expect(apis.isLiking).toHaveBeenCalledOnce()
  })

  it('reuses cached guest results for the locally signed-out identity', async () => {
    localUsername.value = null
    queryClient.setQueryData(['liking', null, 'bob', 'Space'], false)
    const result = setup()
    await flushPromises()
    expect(result.data.value).toBe(false)
    expect(auth.data.value).toBeNull()
  })

  it('exposes an authentication error instead of caching an anonymous false', async () => {
    const result = setup()
    auth.error.value = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    auth.isLoading.value = false
    await flushPromises()
    expect(result.isLoading.value).toBe(false)
    expect(result.data.value).toBeNull()
    expect(result.error.value).not.toBeNull()
    expect(apis.isLiking).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(['liking', null, 'bob', 'Space'])).toBeUndefined()
  })
})
