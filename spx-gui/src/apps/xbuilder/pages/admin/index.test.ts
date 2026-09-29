import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

type MockSignedInState = {
  isSignedIn: boolean
  user: { capabilities: { canManageAccount: boolean; canManageAuthorization: boolean } } | null
}

const mocks = vi.hoisted(() => ({
  route: { path: '/admin/users', fullPath: '/admin/users' },
  replace: vi.fn(),
  signIn: vi.fn(),
  signedInState: {
    isSignedIn: true,
    user: { capabilities: { canManageAccount: true, canManageAuthorization: false } }
  } as MockSignedInState | null,
  signedInData: null as Ref<MockSignedInState | null> | null
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
  canUseAdminConsole: (
    capabilities:
      | {
          canManageAccount: boolean
          canManageAuthorization: boolean
        }
      | null
      | undefined
  ) => capabilities?.canManageAccount === true || capabilities?.canManageAuthorization === true,
  useSignIn: () => mocks.signIn,
  useSignedInStateQuery: () => {
    const data = ref(mocks.signedInState)
    mocks.signedInData = data
    return {
      data,
      error: ref(null),
      isLoading: ref(false)
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
    mocks.signedInState = {
      isSignedIn: true,
      user: { capabilities: { canManageAccount: true, canManageAuthorization: false } }
    }
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
    mocks.signedInState = { isSignedIn: true, user: { capabilities } }

    shallowMount(AdminPage)
    await flushPromises()

    if (defaultRoute == null) expect(mocks.replace).not.toHaveBeenCalled()
    else expect(mocks.replace).toHaveBeenCalledWith(defaultRoute)
  })

  it('starts sign-in when an unauthenticated user opens an Admin child route directly', async () => {
    mocks.signedInState = { isSignedIn: false, user: null }

    shallowMount(AdminPage)
    await flushPromises()

    expect(mocks.signIn).toHaveBeenCalledWith('/admin/users')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('does not redirect from a stale root-route callback after navigation while authentication is loading', async () => {
    mocks.route.path = '/admin'
    mocks.route.fullPath = '/admin'
    mocks.signedInState = null
    shallowMount(AdminPage)

    mocks.route.path = '/admin/apps'
    mocks.route.fullPath = '/admin/apps'
    await nextTick()

    mocks.signedInData!.value = {
      isSignedIn: true,
      user: { capabilities: { canManageAccount: true, canManageAuthorization: false } }
    }
    await nextTick()
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
