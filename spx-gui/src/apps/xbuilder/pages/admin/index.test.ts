import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { until } from '@/utils/utils'
import { nextTick, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

type MockSignedInUser = { capabilities: { canManageAccount: boolean; canManageAuthorization: boolean } }

const mocks = vi.hoisted(() => ({
  route: { path: '/admin/users', fullPath: '/admin/users' },
  replace: vi.fn(),
  signIn: vi.fn(),
  userInfo: { capabilities: { canManageAccount: true, canManageAuthorization: false } } as MockSignedInUser | null,
  userData: null as Ref<MockSignedInUser | null> | null,
  loading: false,
  userLoading: null as Ref<boolean> | null
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
  useSignedIn: () => {
    const data = ref(mocks.userInfo)
    const isLoading = ref(mocks.loading)
    mocks.userData = data
    mocks.userLoading = isLoading
    return {
      getUser: async ({ signal }: { signal?: AbortSignal } = {}) => {
        void data.value
        await until(() => !isLoading.value, signal)
        return data.value
      },
      get user() {
        return data.value
      },
      signIn: mocks.signIn,
      get canUseAdminConsole() {
        return (
          data.value?.capabilities.canManageAccount === true || data.value?.capabilities.canManageAuthorization === true
        )
      }
    }
  }
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
    mocks.signIn.mockReset()
    mocks.userInfo = { capabilities: { canManageAccount: true, canManageAuthorization: false } }
    mocks.loading = false
  })

  it('redirects again when navigating from a child page to the Admin root', async () => {
    shallowMount(AdminPage)

    mocks.route.path = '/admin'
    mocks.route.fullPath = '/admin'
    await nextTick()
    await flushPromises()

    expect(mocks.replace).toHaveBeenCalledWith('/admin/users')
  })

  it.each([
    {
      name: 'Account management only',
      capabilities: { canManageAccount: true, canManageAuthorization: false },
      defaultRoute: '/admin/users'
    },
    {
      name: 'Authorization management only',
      capabilities: { canManageAccount: false, canManageAuthorization: true },
      defaultRoute: '/admin/audit-logs'
    },
    {
      name: 'Account and Authorization management',
      capabilities: { canManageAccount: true, canManageAuthorization: true },
      defaultRoute: '/admin/users'
    },
    {
      name: 'no management capability',
      capabilities: { canManageAccount: false, canManageAuthorization: false },
      defaultRoute: null
    }
  ])('uses the expected default route for $name', async ({ capabilities, defaultRoute }) => {
    mocks.route.path = '/admin'
    mocks.route.fullPath = '/admin'
    mocks.userInfo = { capabilities }

    shallowMount(AdminPage)
    await flushPromises()

    if (defaultRoute == null) expect(mocks.replace).not.toHaveBeenCalled()
    else expect(mocks.replace).toHaveBeenCalledWith(defaultRoute)
  })

  it('starts sign-in when an unauthenticated user opens an Admin child route directly', async () => {
    mocks.userInfo = null

    shallowMount(AdminPage)
    await flushPromises()

    expect(mocks.signIn).toHaveBeenCalledWith('/admin/users')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('does not redirect from a stale root-route callback after navigation while authentication is loading', async () => {
    mocks.route.path = '/admin'
    mocks.route.fullPath = '/admin'
    mocks.userInfo = null
    mocks.loading = true
    shallowMount(AdminPage)

    mocks.route.path = '/admin/apps'
    mocks.route.fullPath = '/admin/apps'
    await nextTick()

    mocks.userData!.value = { capabilities: { canManageAccount: true, canManageAuthorization: false } }
    mocks.userLoading!.value = false
    await nextTick()
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
