import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const userStateStorageKey = 'builder-user'

describe('ensureAccessToken', () => {
  let ensureAccessToken: typeof import('./signed-in').ensureAccessToken
  let initUserState: typeof import('./signed-in').initUserState
  let accountOAuthApisForXBuilder: typeof import('@/apis/account/oauth').accountOAuthApisForXBuilder

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    ;({ ensureAccessToken, initUserState } = await import('./signed-in'))
    ;({ accountOAuthApisForXBuilder } = await import('@/apis/account/oauth'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
