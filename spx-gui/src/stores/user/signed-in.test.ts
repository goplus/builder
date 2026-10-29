import { nextTick, watchEffect } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OAuthException } from '@/apis/common/exception'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import * as userApis from '@/apis/user'
import { OAuthErrorCode } from '@/utils/oauth'
import { type SignedIn } from './signed-in'
import { createSignedIn, makeSignedInUser } from './test'

let signedIn: SignedIn | null = null
const userStateStorageKey = 'builder-user'
const originalNavigatorLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

beforeEach(() => {
  vi.spyOn(userApis, 'getSignedInUser').mockResolvedValue(makeSignedInUser('alice')!)
})

function createLockRequest() {
  let pending = Promise.resolve()
  return vi.fn((_name: string, callback: () => Promise<void>) => {
    const result = pending.then(callback)
    pending = result.catch(() => {})
    return result
  })
}

describe('SignedIn.canUseAdminConsole', () => {
  it.each([
    [{ canManageAccount: false, canManageAuthorization: false }, false],
    [{ canManageAccount: true, canManageAuthorization: false }, true],
    [{ canManageAccount: false, canManageAuthorization: true }, true],
    [{ canManageAccount: true, canManageAuthorization: true }, true]
  ])('checks the current user management capabilities', async (capabilities, expected) => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'token',
        accessTokenExpiresAt: Date.now() + 3_600_000,
        refreshToken: null,
        username: 'alice'
      })
    )
    const instance = createSignedIn({ oauthClientId: 'client-id' })
    const getUser = vi.spyOn(userApis, 'getSignedInUser').mockResolvedValue({
      ...makeSignedInUser('alice')!,
      capabilities: { ...makeSignedInUser('alice')!.capabilities, ...capabilities }
    })
    try {
      expect(instance.canUseAdminConsole).toBeNull()
      await instance.getUser()
      expect(instance.canUseAdminConsole).toBe(expected)
    } finally {
      instance.dispose()
      getUser.mockRestore()
    }
  })
})

describe('ensureAccessToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    signedIn?.dispose()
    vi.restoreAllMocks()
    if (originalNavigatorLocks != null) Object.defineProperty(navigator, 'locks', originalNavigatorLocks)
    else Reflect.deleteProperty(navigator, 'locks')
  })

  it('uses credentials refreshed by another page while waiting for the refresh lock', async () => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'expired-access-token',
        accessTokenExpiresAt: Date.now(),
        refreshToken: 'old-refresh-token',
        username: 'alice'
      })
    )
    const request = vi.fn(async (_name: string, callback: () => Promise<void>) => {
      localStorage.setItem(
        userStateStorageKey,
        JSON.stringify({
          accessToken: 'new-access-token',
          accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
          refreshToken: 'new-refresh-token',
          username: 'alice'
        })
      )
      await callback()
    })
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request
      }
    })
    const refreshToken = vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken')

    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    await expect(signedIn!.ensureAccessToken()).resolves.toBe('new-access-token')
    expect(request).toHaveBeenCalledWith('builder-user-access-token', expect.any(Function))
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('returns the cached access token without acquiring the lock', async () => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    const request = createLockRequest()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request
      }
    })

    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    await expect(signedIn!.ensureAccessToken()).resolves.toBe('access-token')
    expect(request).not.toHaveBeenCalled()
  })

  it('keeps the cached username while automatically loading the refreshed user', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'expired-access-token',
        accessTokenExpiresAt: Date.now(),
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: createLockRequest()
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockResolvedValue({
      access_token: 'new-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
      token_type: 'Bearer'
    })
    const getSignedInUser = vi.spyOn(userApis, 'getSignedInUser')

    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    await expect(signedIn!.ensureAccessToken()).resolves.toBe('new-access-token')
    await signedIn!.getUser()
    expect(getSignedInUser).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(userStateStorageKey)!)).toEqual({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: now + 60 * 60 * 1000,
      refreshToken: 'new-refresh-token',
      username: 'alice'
    })
  })

  it.each([
    ['a network error', () => new TypeError('Failed to fetch')],
    ['a timeout', () => new DOMException('The operation timed out', 'TimeoutError')],
    [
      'a server error',
      () =>
        new OAuthException('server_error', 'server error', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ],
    [
      'an invalid client error',
      () =>
        new OAuthException(OAuthErrorCode.InvalidClient, 'invalid client authentication', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ],
    [
      'an invalid request error',
      () =>
        new OAuthException(OAuthErrorCode.InvalidRequest, 'invalid request', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ],
    [
      'an invalid scope error',
      () =>
        new OAuthException(OAuthErrorCode.InvalidScope, 'invalid scope', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ],
    [
      'an unsupported grant type error',
      () =>
        new OAuthException(OAuthErrorCode.UnsupportedGrantType, 'unsupported grant_type', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ],
    [
      'an unauthorized client error',
      () =>
        new OAuthException(OAuthErrorCode.UnauthorizedClient, 'unauthorized client', null, {
          req: new Request('https://example.com/account/oauth/token')
        })
    ]
  ])('keeps cached state and propagates %s during refresh', async (_name, createError) => {
    const error = createError()
    const storedState = {
      accessToken: 'expired-access-token',
      accessTokenExpiresAt: Date.now(),
      refreshToken: 'refresh-token',
      username: 'alice'
    }
    localStorage.setItem(userStateStorageKey, JSON.stringify(storedState))
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: createLockRequest()
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockRejectedValue(error)

    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    await expect(signedIn!.ensureAccessToken()).rejects.toBe(error)
    expect(JSON.parse(localStorage.getItem(userStateStorageKey)!)).toEqual(storedState)
  })

  it('clears cached state when refresh token is invalid', async () => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'expired-access-token',
        accessTokenExpiresAt: Date.now(),
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: createLockRequest()
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockRejectedValue(
      new OAuthException(OAuthErrorCode.InvalidGrant, 'invalid grant', null, {
        req: new Request('https://example.com/account/oauth/token')
      })
    )

    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    await expect(signedIn!.ensureAccessToken()).resolves.toBe(null)
    expect(localStorage.getItem(userStateStorageKey)).toBeNull()
  })

  it('clears cached state when the shared state is removed', async () => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: createLockRequest()
      }
    })
    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    localStorage.removeItem(userStateStorageKey)
    window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))

    await expect(signedIn!.ensureAccessToken()).resolves.toBe(null)
  })

  it('clears cached state when the shared storage is cleared', async () => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: createLockRequest()
      }
    })
    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })

    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))

    await expect(signedIn!.ensureAccessToken()).resolves.toBe(null)
  })

  it('does not write state back after receiving a storage event', () => {
    signedIn?.dispose()
    signedIn = createSignedIn({ oauthClientId: 'client-id' })
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
        refreshToken: 'refresh-token',
        username: 'alice'
      })
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))

    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('SignedIn.isSignedIn', () => {
  afterEach(() => {
    signedIn?.dispose()
    signedIn = null
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it.each([
    [null, null, false],
    ['valid', null, true],
    ['expired', null, false],
    ['expired', 'refresh', true]
  ])('judges local credentials synchronously (%s, %s)', (accessToken, refreshToken, expected) => {
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken,
        accessTokenExpiresAt: Date.now() + (accessToken === 'valid' ? 120_000 : -120_000),
        refreshToken,
        username: accessToken == null ? null : 'alice'
      })
    )
    signedIn = createSignedIn({ oauthClientId: 'test' })
    expect(signedIn.isSignedIn).toBe(expected)
    expect(signedIn.username).toBe(expected ? 'alice' : null)
  })

  it('keeps login state stable until credentials are updated', () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    localStorage.setItem(
      userStateStorageKey,
      JSON.stringify({
        accessToken: 'token',
        accessTokenExpiresAt: now + 120_000,
        refreshToken: null,
        username: 'alice'
      })
    )
    signedIn = createSignedIn({ oauthClientId: 'test' })
    expect(signedIn.isSignedIn).toBe(true)
    now += 65_000
    expect(signedIn.isSignedIn).toBe(true)
    expect(signedIn.username).toBe('alice')
    window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))
    expect(signedIn.isSignedIn).toBe(false)
    expect(signedIn.username).toBeNull()
  })

  it('keeps effects stable when another tab rotates credentials before user data loads', async () => {
    const credentials = {
      accessToken: 'first',
      accessTokenExpiresAt: Date.now() + 120_000,
      refreshToken: 'refresh',
      username: 'alice'
    }
    localStorage.setItem(userStateStorageKey, JSON.stringify(credentials))
    signedIn = createSignedIn({ oauthClientId: 'test' })
    const values: unknown[] = []
    const stop = watchEffect(() => values.push([signedIn!.isSignedIn, signedIn!.username]))
    try {
      localStorage.setItem(
        userStateStorageKey,
        JSON.stringify({ ...credentials, accessToken: 'rotated', refreshToken: 'rotated-refresh' })
      )
      window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))
      await nextTick()
      expect(values).toEqual([[true, 'alice']])
      localStorage.removeItem(userStateStorageKey)
      window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))
      await nextTick()
      expect(values).toEqual([
        [true, 'alice'],
        [false, null]
      ])
    } finally {
      stop()
    }
  })
})
