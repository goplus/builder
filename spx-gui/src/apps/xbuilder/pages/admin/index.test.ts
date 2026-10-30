import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { until } from '@/utils/utils'
import { ActionException } from '@/utils/exception'
import { nextTick, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

type MockSignedInUser = {
  capabilities: { canManageAccount: boolean; canManageAuthorization: boolean; canManageFeedback: boolean }
}

const mocks = vi.hoisted(() => ({
  route: { path: '/admin/users', fullPath: '/admin/users' },
  replace: vi.fn(),
  signIn: vi.fn(),
  userInfo: {
    capabilities: { canManageAccount: true, canManageAuthorization: false, canManageFeedback: false }
  } as MockSignedInUser | null,
  userData: null as Ref<MockSignedInUser | null> | null,
  loading: false,
  getUserError: null as ActionException | null,
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
        if (mocks.getUserError != null) throw mocks.getUserError
        return data.value
      },
      get user() {
        return data.value
      },
      signIn: mocks.signIn,
      get canUseAdminConsole() {
        return (
          data.value?.capabilities.canManageAccount === true ||
          data.value?.capabilities.canManageAuthorization === true ||
          data.value?.capabilities.canManageFeedback === true
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
    mocks.userInfo = {
      capabilities: { canManageAccount: true, canManageAuthorization: false, canManageFeedback: false }
    }
    mocks.loading = false
    mocks.getUserError = null
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
      capabilities: { canManageAccount: true, canManageAuthorization: false, canManageFeedback: false },
      defaultRoute: '/admin/users'
    },
    {
      name: 'Authorization management only',
      capabilities: { canManageAccount: false, canManageAuthorization: true, canManageFeedback: false },
      defaultRoute: '/admin/audit-logs'
    },
    {
      name: 'Account and Authorization management',
      capabilities: { canManageAccount: true, canManageAuthorization: true, canManageFeedback: false },
      defaultRoute: '/admin/users'
    },
    {
      name: 'Feedback management only',
      capabilities: { canManageAccount: false, canManageAuthorization: false, canManageFeedback: true },
      defaultRoute: '/admin/feedback'
    },
    {
      name: 'Authorization and Feedback management',
      capabilities: { canManageAccount: false, canManageAuthorization: true, canManageFeedback: true },
      defaultRoute: '/admin/feedback'
    },
    {
      name: 'no management capability',
      capabilities: { canManageAccount: false, canManageAuthorization: false, canManageFeedback: false },
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

  it.each(['/admin', '/admin/apps'])('recovers from a profile load failure at %s', async (path) => {
    mocks.route.path = path
    mocks.route.fullPath = path
    mocks.getUserError = new ActionException(new Error('offline'), { en: 'Failed to load user', zh: '加载用户失败' })
    const wrapper = shallowMount(AdminPage, {
      global: { mocks: { $t: (message: { en: string }) => message.en } }
    })
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
    const retry = wrapper.findComponent({ name: 'UIError' }).props('retry')
    expect(retry).toBeTypeOf('function')

    mocks.getUserError = null
    retry()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'UIError' }).exists()).toBe(false)
    if (path === '/admin') expect(mocks.replace).toHaveBeenCalledWith('/admin/users')
    else expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
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

    mocks.userData!.value = {
      capabilities: { canManageAccount: true, canManageAuthorization: false, canManageFeedback: false }
    }
    mocks.userLoading!.value = false
    await nextTick()
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
