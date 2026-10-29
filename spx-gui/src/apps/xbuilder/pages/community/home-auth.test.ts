import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { createI18n } from '@/utils/i18n'
import * as projectApis from '@/apis/project'
import { makeSignedInMock, makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import Home from './home.vue'

let query: ReturnType<typeof makeSignedInStateQuery>
vi.mock('@/stores/user', () => ({
  useSignedIn: () => {
    const signedIn = makeSignedInMock(query)
    signedIn.isSignedIn = () => query.data.value?.isSignedIn ?? true
    return signedIn
  }
}))
enableAutoUnmount(afterEach)

describe('Home authentication presentation', () => {
  beforeEach(() => {
    query = makeSignedInStateQuery(null)
    vi.spyOn(projectApis, 'exploreProjects').mockResolvedValue([])
    vi.spyOn(projectApis, 'listSignedInUserProjects')
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps local sign-in while user data is loading or fails', async () => {
    const page = shallowMount(Home, {
      global: { plugins: [createI18n({ lang: 'en' })], directives: { radar: {} }, renderStubDefaultSlot: true }
    })
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(false)
    expect(projectApis.listSignedInUserProjects).not.toHaveBeenCalled()

    query.error.value = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    query.isLoading.value = false
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(false)
    expect(projectApis.listSignedInUserProjects).not.toHaveBeenCalled()

    query.error.value = null
    query.data.value = makeSignedInState(null)
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(true)
  })
})
