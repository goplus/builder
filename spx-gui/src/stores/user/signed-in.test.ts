import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OAuthException } from '@/apis/common/exception'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import * as userApis from '@/apis/user'
import { OAuthErrorCode } from '@/utils/oauth'
import { ensureAccessToken, initUserState } from './signed-in'

const userStateStorageKey = 'builder-user'
const originalNavigatorLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

describe('ensureAccessToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
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

    initUserState('client-id')

    await expect(ensureAccessToken()).resolves.toBe('new-access-token')
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
    const request = vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request
      }
    })

    initUserState('client-id')

    await expect(ensureAccessToken()).resolves.toBe('access-token')
    expect(request).not.toHaveBeenCalled()
  })

  it('keeps the cached username without fetching it after refresh', async () => {
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
        request: vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockResolvedValue({
      access_token: 'new-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
      token_type: 'Bearer'
    })
    const getSignedInUser = vi.spyOn(userApis, 'getSignedInUser')

    initUserState('client-id')

    await expect(ensureAccessToken()).resolves.toBe('new-access-token')
    expect(getSignedInUser).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(userStateStorageKey)!)).toEqual({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
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
        request: vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockRejectedValue(error)

    initUserState('client-id')

    await expect(ensureAccessToken()).rejects.toBe(error)
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
        request: vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
      }
    })
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockRejectedValue(
      new OAuthException(OAuthErrorCode.InvalidGrant, 'invalid grant', null, {
        req: new Request('https://example.com/account/oauth/token')
      })
    )

    initUserState('client-id')

    await expect(ensureAccessToken()).resolves.toBe(null)
    expect(JSON.parse(localStorage.getItem(userStateStorageKey)!)).toEqual({
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      username: null
    })
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
        request: vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
      }
    })
    initUserState('client-id')

    localStorage.removeItem(userStateStorageKey)
    window.dispatchEvent(new StorageEvent('storage', { key: userStateStorageKey }))

    await expect(ensureAccessToken()).resolves.toBe(null)
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
        request: vi.fn(async (_name: string, callback: () => Promise<void>) => callback())
      }
    })
    initUserState('client-id')

    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))

    await expect(ensureAccessToken()).resolves.toBe(null)
  })

  it('does not write state back after receiving a storage event', () => {
    initUserState('client-id')
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
