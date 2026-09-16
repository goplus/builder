import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  route: { path: '/admin/users', fullPath: '/admin/users' },
  replace: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => {
  const { reactive } = await import('vue')
  const actual = await importOriginal<typeof import('vue-router')>()
  mocks.route = reactive(mocks.route)
  return {
    ...actual,
    useRoute: () => mocks.route,
    useRouter: () => ({ push: vi.fn(), replace: mocks.replace })
  }
})

vi.mock('@/stores/user', () => ({
  useSignIn: () => vi.fn(),
  useSignedInStateQuery: () => ({
    data: ref({
      isSignedIn: true,
      user: { capabilities: { canManageAccount: true, canManageAuthorization: false } }
    }),
    error: ref(null),
    isLoading: ref(false)
  })
}))

vi.mock('@/utils/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/utils')>()),
  usePageTitle: vi.fn()
}))

import AdminPage from './index.vue'

describe('Admin page routing', () => {
  beforeEach(() => {
    mocks.route.path = '/admin/users'
    mocks.route.fullPath = '/admin/users'
    mocks.replace.mockReset()
  })

  it('redirects again when navigating from a child page to the Admin root', async () => {
    shallowMount(AdminPage)

    mocks.route.path = '/admin'
    mocks.route.fullPath = '/admin'
    await nextTick()
    await flushPromises()

    expect(mocks.replace).toHaveBeenCalledWith('/admin/users')
  })
})
