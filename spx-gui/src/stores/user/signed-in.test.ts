import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withSetup } from '@/utils/test'

const createPushedAuthorizationRequest = vi.fn()
const exchangeAuthorizationCode = vi.fn()
const exchangeRefreshToken = vi.fn()
const revokeOAuthToken = vi.fn()
const getSignedInUser = vi.fn()
const useVueQueryMock = vi.fn()
const pendingAuthorizationStorageKey = 'spx-account-oauth:pending-authorization'

vi.mock('@/utils/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/env')>()
  return {
    ...actual,
    accountOAuthClientId: 'client-123',
    apiBaseUrl: '/api'
  }
})

vi.mock('@/apis/account-oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/apis/account-oauth')>()
  return {
    ...actual,
    createPushedAuthorizationRequest,
    exchangeAuthorizationCode,
    exchangeRefreshToken,
    revokeOAuthToken
  }
})

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

describe('signed-in user store', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    createPushedAuthorizationRequest.mockReset()
    exchangeAuthorizationCode.mockReset()
    exchangeRefreshToken.mockReset()
    revokeOAuthToken.mockReset()
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
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should change the signed-in user query key across sign-in and sign-out transitions', async () => {
    const userStore = await import('./signed-in')
    getSignedInUser.mockResolvedValue({ username: 'alice' })

    withSetup(() => userStore.useSignedInUser())
    expect(useVueQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.any(Object) }))
    let queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['user', '', 'signed-in'])

    await userStore.signInWithAccessToken('token-a')
    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['user', 'alice', 'signed-in'])

    userStore.signOut()
    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['user', '', 'signed-in'])
  })

  it('should resolve username from the access token when signing in with a token', async () => {
    const userStore = await import('./signed-in')
    getSignedInUser.mockResolvedValue({ username: 'alice' })

    await expect(userStore.signInWithAccessToken('token-a')).resolves.toBeUndefined()
    expect(userStore.isSignedIn()).toBe(true)
    expect(userStore.getUnresolvedSignedInUsername()).toBe('alice')
    expect(getSignedInUser).toHaveBeenCalledWith('token-a')
  })

  it('should keep the guest signed-in user query key when resolving access token for a guest session', async () => {
    const userStore = await import('./signed-in')

    withSetup(() => userStore.useSignedInUser())
    let queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['user', '', 'signed-in'])

    await expect(userStore.ensureAccessToken()).resolves.toBeNull()

    withSetup(() => userStore.useSignedInUser())
    queryKey = useVueQueryMock.mock.lastCall?.[0]?.queryKey
    expect(queryKey.value).toEqual(['user', '', 'signed-in'])
  })

  it('should complete OAuth callback sign-in and return the stored returnTo', async () => {
    const userStore = await import('./signed-in')
    getSignedInUser.mockResolvedValue({ username: 'alice' })

    sessionStorage.setItem(
      pendingAuthorizationStorageKey,
      JSON.stringify({ state: 'state-a', codeVerifier: 'verifier-a', returnTo: '/editor/demo' })
    )
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'token-a',
      expires_in: 3600,
      refresh_token: 'refresh-a'
    })

    await expect(userStore.completeAuthorizationCodeSignIn('?code=code-a&state=state-a')).resolves.toEqual({
      returnTo: '/editor/demo'
    })
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith('code-a', 'verifier-a')
    expect(userStore.isSignedIn()).toBe(true)
    expect(getSignedInUser).toHaveBeenCalledWith('token-a')
    expect(sessionStorage.getItem(pendingAuthorizationStorageKey)).toBe(null)
  })

  it('should build sign-in URLs through the authorize endpoint on the main-site api origin', async () => {
    const userStore = await import('./signed-in')

    createPushedAuthorizationRequest.mockResolvedValueOnce({
      request_uri: 'urn:request:1'
    })

    await expect(userStore.createAuthorizationRequest('/editor/demo')).resolves.toEqual({
      requestUri: 'urn:request:1',
      signInUrl: 'http://localhost:3000/account/oauth/authorize?client_id=client-123&request_uri=urn%3Arequest%3A1'
    })
    expect(sessionStorage.getItem(pendingAuthorizationStorageKey)).toMatch(/"returnTo":"\/editor\/demo"/)
    expect(createPushedAuthorizationRequest).toHaveBeenCalledTimes(1)
    expect(createPushedAuthorizationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.any(String),
        codeChallenge: expect.any(String)
      })
    )
  })

  it('should redirect initiateSignIn through the authorize endpoint returned from the main-site api origin', async () => {
    const userStore = await import('./signed-in')

    createPushedAuthorizationRequest.mockResolvedValueOnce({
      request_uri: 'urn:request:1'
    })

    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)

    await userStore.initiateSignIn('/editor/demo')

    expect(assign).toHaveBeenCalledWith(
      'http://localhost:3000/account/oauth/authorize?client_id=client-123&request_uri=urn%3Arequest%3A1'
    )
  })

  it('should clear pending OAuth authorization when callback token exchange fails', async () => {
    const userStore = await import('./signed-in')
    const exchangeError = new Error('token exchange failed')

    sessionStorage.setItem(
      pendingAuthorizationStorageKey,
      JSON.stringify({ state: 'state-a', codeVerifier: 'verifier-a', returnTo: '/editor/demo' })
    )
    exchangeAuthorizationCode.mockRejectedValueOnce(exchangeError)

    await expect(userStore.completeAuthorizationCodeSignIn('?code=code-a&state=state-a')).rejects.toBe(exchangeError)
    expect(userStore.isSignedIn()).toBe(false)
    expect(sessionStorage.getItem(pendingAuthorizationStorageKey)).toBe(null)
  })

  it('should use the rotated refresh token on the next refresh', async () => {
    const userStore = await import('./signed-in')
    getSignedInUser.mockResolvedValue({ username: 'alice' })

    sessionStorage.setItem(
      pendingAuthorizationStorageKey,
      JSON.stringify({ state: 'state-a', codeVerifier: 'verifier-a', returnTo: '/editor/demo' })
    )
    exchangeAuthorizationCode.mockResolvedValueOnce({
      access_token: 'token-a',
      expires_in: 0,
      refresh_token: 'refresh-a'
    })

    await userStore.completeAuthorizationCodeSignIn('?code=code-a&state=state-a')

    exchangeRefreshToken.mockResolvedValueOnce({
      access_token: 'token-b',
      expires_in: 0,
      refresh_token: 'refresh-b'
    })
    await expect(userStore.refreshAccessToken()).resolves.toBe('token-b')
    expect(exchangeRefreshToken).toHaveBeenNthCalledWith(1, 'refresh-a')
    exchangeRefreshToken.mockResolvedValueOnce({
      access_token: 'token-c',
      expires_in: 3600,
      refresh_token: 'refresh-c'
    })
    await expect(userStore.refreshAccessToken()).resolves.toBe('token-c')
    expect(exchangeRefreshToken).toHaveBeenNthCalledWith(2, 'refresh-b')
  })
})
