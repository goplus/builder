import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withSetup } from '@/utils/test'

const exchangeForAccessToken = vi.fn()
const refreshAccessToken = vi.fn()
const signinRedirect = vi.fn()
const getSignedInUser = vi.fn()
const clientGet = vi.fn()
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

const Client = vi.fn(function MockClient(this: { get: typeof clientGet; setTokenProvider: ReturnType<typeof vi.fn> }) {
  this.get = clientGet
  this.setTokenProvider = vi.fn()
})

vi.mock('@/apis/common/client', () => ({
  Client
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
    clientGet.mockReset()
    Client.mockClear()
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
    const userStore = await import('./signed-in')
    clientGet.mockResolvedValue({ username: 'alice' })

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

  it('should resolve username from the access token when signing in with a token', async () => {
    const userStore = await import('./signed-in')
    clientGet.mockResolvedValue({ username: 'alice' })

    await expect(userStore.signInWithAccessToken('token-a')).resolves.toBeUndefined()
    expect(userStore.isSignedIn()).toBe(true)
    expect(userStore.getUnresolvedSignedInUsername()).toBe('alice')
    expect(clientGet).toHaveBeenCalledWith('/user')
    expect(getSignedInUser).not.toHaveBeenCalled()
  })

  it('should not bump auth-session scope when resolving access token for a guest session', async () => {
    const userStore = await import('./signed-in')

    withSetup(() => userStore.useSignedInUser())
    let queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['signed-in-user', 0])

    await expect(userStore.ensureAccessToken()).resolves.toBeNull()

    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['signed-in-user', 0])
  })
})
