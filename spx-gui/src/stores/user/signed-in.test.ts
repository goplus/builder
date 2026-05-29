import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withSetup } from '@/utils/test'

const exchangeForAccessToken = vi.fn()
const refreshAccessToken = vi.fn()
const signinRedirect = vi.fn()
const getSignedInUser = vi.fn()
const useVueQueryMock = vi.fn()

class MockCasdoorSdk {
  exchangeForAccessToken() {
    return exchangeForAccessToken()
  }

  refreshAccessToken(...args: unknown[]) {
    return refreshAccessToken(...args)
  }

  signin_redirect(...args: unknown[]) {
    return signinRedirect(...args)
  }
}

vi.mock('casdoor-js-sdk', () => ({
  default: MockCasdoorSdk
}))

vi.mock('@/apis/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/apis/user')>()
  return {
    ...actual,
    getSignedInUser
  }
})

vi.mock('@/utils/query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/query')>()
  return {
    ...actual,
    useQueryWithCache: useVueQueryMock
  }
})

describe('signed-in user query key scope', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    exchangeForAccessToken.mockReset()
    refreshAccessToken.mockReset()
    signinRedirect.mockReset()
    getSignedInUser.mockReset()
    useVueQueryMock.mockReset()
    useVueQueryMock.mockReturnValue({
      isLoading: ref(false),
      data: shallowRef(null),
      error: shallowRef(null),
      progress: shallowRef({ percentage: 0, timeLeft: null, desc: null }),
      refetch: vi.fn()
    })
    vi.resetModules()
  })

  afterEach(async () => {
    const userStore = await import('./signed-in')
    userStore.signOut()
    vi.restoreAllMocks()
  })

  it('should change the signed-in user query key across sign-in and sign-out transitions', async () => {
    getSignedInUser.mockResolvedValue({
      id: 'user-id',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      username: 'alice',
      displayName: 'Alice',
      avatar: '',
      description: '',
      plan: 'free',
      capabilities: {
        canManageAssets: false,
        canManageCourses: false,
        canUsePremiumLLM: false
      }
    })

    const userStore = await import('./signed-in')

    withSetup(() => userStore.useSignedInUser())
    expect(useVueQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.any(Object) }))
    let queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['signed-in-user', 0])

    await userStore.signInWithAccessToken('token-a')
    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['signed-in-user', 1])

    userStore.signOut()
    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['signed-in-user', 2])
  })

  it('should keep auth state when syncing username hint fails transiently during sign-in', async () => {
    const userStore = await import('./signed-in')

    getSignedInUser.mockRejectedValueOnce(new Error('network error'))

    await expect(userStore.signInWithAccessToken('token-a')).resolves.toBeUndefined()
    expect(userStore.isSignedIn()).toBe(true)
    expect(userStore.getUnresolvedSignedInUsername()).toBe(null)
  })

  it('should still fail sign-in and clear auth state on unauthorized username sync', async () => {
    const userStore = await import('./signed-in')
    const { ApiException, ApiExceptionCode } = await import('@/apis/common/exception')
    const unauthorizedError = new ApiException(ApiExceptionCode.errorUnauthorized, 'Unauthorized', {
      req: new Request('https://api.example.com/user', { method: 'GET' })
    })

    getSignedInUser.mockRejectedValueOnce(unauthorizedError)

    await expect(userStore.signInWithAccessToken('token-a')).rejects.toBe(unauthorizedError)
    expect(userStore.isSignedIn()).toBe(false)
    expect(userStore.getUnresolvedSignedInUsername()).toBe(null)
  })
})
