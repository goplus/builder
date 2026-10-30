import { ref } from 'vue'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { createI18n } from '@/utils/i18n'
import * as projectApis from '@/apis/project'
import { makeSignedInMock, makeSignedInUserQuery } from '@/stores/user/test'
import Home from './home.vue'

let query: ReturnType<typeof makeSignedInUserQuery>
let username = ref<string | null>('alice')
vi.mock('@/stores/user', () => ({ useSignedIn: () => makeSignedInMock(query, username) }))
enableAutoUnmount(afterEach)

describe('Home authentication presentation', () => {
  beforeEach(() => {
    query = makeSignedInUserQuery(null, true)
    username = ref<string | null>('alice')
    vi.spyOn(projectApis, 'exploreProjects').mockResolvedValue([])
    vi.spyOn(projectApis, 'listSignedInUserProjects').mockResolvedValue({ data: [], total: 0 })
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps local sign-in while user data is loading or fails', async () => {
    const page = shallowMount(Home, {
      global: { plugins: [createI18n({ lang: 'en' })], directives: { radar: {} }, renderStubDefaultSlot: true }
    })
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(false)
    expect(projectApis.listSignedInUserProjects).toHaveBeenCalledOnce()

    query.error.value = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    query.isLoading.value = false
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(false)
    expect(projectApis.listSignedInUserProjects).toHaveBeenCalledOnce()

    query.error.value = null
    username.value = null
    await flushPromises()
    expect(page.findComponent({ name: 'GuestBanner' }).exists()).toBe(true)
  })
})
