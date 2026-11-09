import { ref } from 'vue'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { makeSignedInMock, makeSignedInUserQuery } from '@/stores/user/test'
import type { Round } from '@/components/copilot/copilot'
import SignInTip from './SignInTip.vue'

let query: ReturnType<typeof makeSignedInUserQuery>
let localUsername = ref<string | null>('alice')
vi.mock('@/stores/user', () => ({ useSignedIn: () => makeSignedInMock(query, localUsername) }))
enableAutoUnmount(afterEach)

describe('SignInTip', () => {
  beforeEach(() => {
    query = makeSignedInUserQuery(null, true)
    localUsername = ref<string | null>('alice')
  })

  it.each(['alice', null])('uses local identity to decide whether to retry for %s', async (username) => {
    localUsername.value = username
    const retry = vi.fn()
    shallowMount(SignInTip, {
      props: { round: { retry } as unknown as Round },
      global: { mocks: { $t: (message: { en: string }) => message.en } }
    })
    await flushPromises()
    expect(query.data.value).toBeNull()
    expect(retry).toHaveBeenCalledTimes(username == null ? 0 : 1)
  })

  it('retries for a locally signed-in user even when loading user information failed', async () => {
    query.error.value = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    query.isLoading.value = false
    const retry = vi.fn()
    shallowMount(SignInTip, {
      props: { round: { retry } as unknown as Round },
      global: { mocks: { $t: (message: { en: string }) => message.en } }
    })
    await flushPromises()
    expect(retry).toHaveBeenCalledOnce()
  })
})
