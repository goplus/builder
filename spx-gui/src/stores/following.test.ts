import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import * as apis from '@/apis/user'
import { makeSignedInMock, makeSignedInUserQuery } from './user/test'
import { useIsFollowing } from './following'

let auth: ReturnType<typeof makeSignedInUserQuery>
let username = ref<string | null>('alice')
let queryClient: QueryClient
vi.mock('./user', () => ({ useSignedIn: () => makeSignedInMock(auth, username) }))
enableAutoUnmount(afterEach)

function setup(target: string) {
  let result!: ReturnType<typeof useIsFollowing>
  mount(
    defineComponent({
      setup() {
        result = useIsFollowing(() => target)
        return () => null
      }
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
  )
  return result
}

beforeEach(() => {
  auth = makeSignedInUserQuery(null, true)
  username = ref<string | null>('alice')
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(apis, 'isFollowing').mockResolvedValue(true)
})
afterEach(() => {
  queryClient.clear()
  vi.restoreAllMocks()
})

describe('following with local identity', () => {
  it('loads following while user information is unavailable', async () => {
    auth.error.value = new ActionException(new Error('offline'), { en: 'Failed', zh: '失败' })
    auth.isLoading.value = false
    const result = setup('bob')
    await flushPromises()
    expect(result.data.value).toBe(true)
    expect(apis.isFollowing).toHaveBeenCalledExactlyOnceWith('bob')
  })

  it.each(['alice', null])('resolves false for self or a guest (%s)', async (currentUsername) => {
    username.value = currentUsername
    const result = setup('alice')
    await flushPromises()
    expect(result.data.value).toBe(false)
    expect(apis.isFollowing).not.toHaveBeenCalled()
  })
})
