import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { makeSignedInMock, makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import type { Round } from '@/components/copilot/copilot'
import SignInTip from './SignInTip.vue'

let query: ReturnType<typeof makeSignedInStateQuery>
vi.mock('@/stores/user', () => ({ useSignedIn: () => makeSignedInMock(query) }))
enableAutoUnmount(afterEach)

describe('SignInTip', () => {
  beforeEach(() => {
    query = makeSignedInStateQuery(null)
  })

  it.each(['alice', null])('waits before deciding whether to retry for %s', async (username) => {
    const retry = vi.fn()
    shallowMount(SignInTip, {
      props: { round: { retry } as unknown as Round },
      global: { mocks: { $t: (message: { en: string }) => message.en } }
    })
    await flushPromises()
    expect(retry).not.toHaveBeenCalled()
    query.data.value = makeSignedInState(username)
    query.isLoading.value = false
    await flushPromises()
    expect(retry).toHaveBeenCalledTimes(username == null ? 0 : 1)
  })

  it('propagates an authentication error without retrying', async () => {
    const retry = vi.fn()
    const errorHandler = vi.fn()
    shallowMount(SignInTip, {
      props: { round: { retry } as unknown as Round },
      global: { mocks: { $t: (message: { en: string }) => message.en }, config: { errorHandler } }
    })
    const error = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    query.error.value = error
    query.isLoading.value = false
    await flushPromises()
    expect(retry).not.toHaveBeenCalled()
    expect(errorHandler).toHaveBeenCalledWith(error, expect.anything(), 'mounted hook')
  })
})
