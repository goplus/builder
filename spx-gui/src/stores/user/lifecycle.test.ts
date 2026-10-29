import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, watchEffect } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { untilLoaded } from '@/utils/query'
import { Cancelled } from '@/utils/exception'
import { OAuthFlow } from '@/utils/oauth'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import { createSignedIn, useSignedIn, type SignedIn, type SignedInUser } from './signed-in'
import { useUser } from './index'
import { makeSignedInState, mockCompleteSignIn } from './test'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function user(username: string) {
  return makeSignedInState(username).user!
}
function credentials(username = 'alice', expired = false) {
  localStorage.setItem(
    'builder-user',
    JSON.stringify({
      accessToken: `${username}-token`,
      accessTokenExpiresAt: Date.now() + (expired ? 0 : 3_600_000),
      refreshToken: `${username}-refresh`,
      username
    })
  )
}
function install(signedIn: SignedIn, setup: () => void = () => {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(
    defineComponent({
      setup() {
        setup()
        return () => null
      }
    }),
    {
      global: { plugins: [createI18n({ lang: 'en' }), [VueQueryPlugin, { queryClient }], signedIn] }
    }
  )
}
const instances: SignedIn[] = []
function create() {
  const signedIn = createSignedIn({ clientId: 'test' })
  instances.push(signedIn)
  return signedIn
}
const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')
enableAutoUnmount(afterEach)
beforeEach(() => {
  localStorage.clear()
  credentials()
  vi.spyOn(userApis, 'getSignedInUser').mockResolvedValue(user('alice'))
  vi.spyOn(userApis, 'updateSignedInUser').mockResolvedValue({ ...user('alice'), displayName: 'Updated' })
  vi.spyOn(accountOAuthApisForXBuilder, 'revokeToken').mockResolvedValue()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, fn: () => Promise<void>) => {
        await Promise.resolve()
        return fn()
      }
    }
  })
})
afterEach(() => {
  instances.splice(0).forEach((instance) => instance.dispose())
  vi.restoreAllMocks()
  if (originalLocks != null) Object.defineProperty(navigator, 'locks', originalLocks)
  else Reflect.deleteProperty(navigator, 'locks')
})

describe('app-owned signed-in lifecycle', () => {
  it('shares one load and provides the same instance to consumers', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValue(pending.promise)
    const signedIn = create()
    install(signedIn, () => {
      expect(useSignedIn()).toBe(signedIn)
      expect(useSignedIn()).toBe(signedIn)
    })
    expect(signedIn.isSignedIn()).toBe(true)
    expect(signedIn.username).toBe('alice')
    expect(signedIn.state.data.value).toBeNull()
    signedIn.reload()
    signedIn.reload()
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
    pending.resolve(user('alice'))
    await untilLoaded(signedIn.state)
    expect(signedIn.isSignedIn()).toBe(true)
  })

  it('loads user information independently of persisted credentials', async () => {
    const stored = localStorage.getItem('builder-user')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('renamed'))
    const signedIn = create()
    install(signedIn)
    await untilLoaded(signedIn.state)
    expect(signedIn.user).toEqual(user('renamed'))
    expect(signedIn.username).toBe('alice')
    expect(localStorage.getItem('builder-user')).toBe(stored)
    expect(await signedIn.ensureAccessToken()).toBe('alice-token')
  })

  it('keeps initial errors distinct from signed out and retries', async () => {
    vi.mocked(userApis.getSignedInUser).mockRejectedValueOnce(new TypeError('offline'))
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    expect(signedIn.isSignedIn()).toBe(true)
    expect(signedIn.username).toBe('alice')
    expect(signedIn.state.data.value).toBeNull()
    await expect(untilLoaded(signedIn.state)).rejects.toThrow('offline')
    signedIn.reload()
    await untilLoaded(signedIn.state)
    expect(signedIn.username).toBe('alice')
  })

  it('keeps identity effects stable on profile updates and token rotation', async () => {
    const signedIn = create()
    const identities: unknown[] = []
    install(signedIn, () => watchEffect(() => identities.push([signedIn.isSignedIn(), signedIn.username])))
    await flushPromises()
    identities.length = 0
    await signedIn.updateProfile({ displayName: 'Updated' })
    await flushPromises()
    expect(signedIn.user?.displayName).toBe('Updated')
    expect(identities).toEqual([])
    credentials('alice', true)
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockResolvedValue({
      access_token: 'rotated',
      refresh_token: 'rotated-refresh',
      expires_in: 3600,
      token_type: 'Bearer'
    })
    await signedIn.ensureAccessToken()
    await flushPromises()
    expect(identities).toEqual([])
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
  })

  it('discards late user loads after switching accounts', async () => {
    const old = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(old.promise)
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(signedIn, 'bob-token')
    old.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.username).toBe('bob')
    expect(signedIn.state.isLoading.value).toBe(false)
  })

  it('discards late profile mutations after switching accounts', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    const old = deferred<SignedInUser>()
    vi.mocked(userApis.updateSignedInUser).mockReturnValue(old.promise)
    const updating = signedIn.updateProfile({ displayName: 'Old edits' })
    const rejected = expect(updating).rejects.toBeInstanceOf(Cancelled)
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(signedIn, 'bob-token')
    old.resolve({ ...user('alice'), displayName: 'Old edits' })
    await rejected
    expect(signedIn.username).toBe('bob')
  })

  it('keeps a successful mutation when an older reload finishes later', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    const old = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValue(old.promise)
    signedIn.reload()
    await flushPromises()
    await signedIn.updateProfile({ displayName: 'Updated' })
    old.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.user?.displayName).toBe('Updated')
    expect(signedIn.state.isLoading.value).toBe(false)
  })

  it('does not restore late rotated tokens after sign-out', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    credentials('alice', true)
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    const refresh = deferred<Awaited<ReturnType<typeof accountOAuthApisForXBuilder.refreshToken>>>()
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockReturnValue(refresh.promise)
    const refreshing = signedIn.ensureAccessToken()
    const rejected = expect(refreshing).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    await signedIn.signOut()
    refresh.resolve({ access_token: 'late', expires_in: 3600, token_type: 'Bearer' })
    await rejected
    expect(signedIn.isSignedIn()).toBe(false)
    expect(JSON.parse(localStorage.getItem('builder-user')!).accessToken).toBeNull()
  })

  it.each([null, 'alice'])('preserves the %s session when candidate credentials fail validation', async (username) => {
    if (username == null) localStorage.clear()
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    const stored = localStorage.getItem('builder-user')
    const state = signedIn.state.data.value
    vi.mocked(userApis.getSignedInUser).mockRejectedValueOnce(new TypeError('offline'))
    await expect(mockCompleteSignIn(signedIn, 'candidate-token')).rejects.toThrow('offline')
    expect(localStorage.getItem('builder-user')).toBe(stored)
    expect(signedIn.state.data.value).toBe(state)
    expect(signedIn.state.isLoading.value).toBe(false)
    expect(signedIn.state.error.value).toBeNull()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(signedIn, 'candidate-token')
    expect(signedIn.username).toBe('bob')
  })

  it('disposes the listener and ignores pending work on app unmount', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const signedIn = create()
    const wrapper = install(signedIn)
    await flushPromises()
    wrapper.unmount()
    pending.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.user).toBeNull()
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
  })

  it('updates public profile consumers without reloading its own user', async () => {
    vi.spyOn(userApis, 'getUser').mockResolvedValue(user('alice'))
    const signedIn = create()
    let profile!: ReturnType<typeof useUser>
    install(signedIn, () => {
      profile = useUser(() => signedIn.username)
    })
    await flushPromises()
    vi.mocked(userApis.getUser).mockResolvedValue({ ...user('alice'), displayName: 'Updated' })
    await signedIn.updateProfile({ displayName: 'Updated' })
    await flushPromises()
    await vi.waitFor(() => expect(profile.data.value?.displayName).toBe('Updated'))
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
  })

  it('completes OAuth sign-in and preserves the requested return route', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    vi.spyOn(OAuthFlow.prototype, 'completeAuthorization').mockResolvedValue({
      token: { access_token: 'oauth-token', refresh_token: 'oauth-refresh', expires_in: 3600, token_type: 'Bearer' },
      extraData: { returnTo: '/admin/apps' }
    })
    const writes = vi.spyOn(localStorage, 'setItem')
    vi.mocked(userApis.getSignedInUser).mockClear()
    await expect(signedIn.completeSignIn('?code=code&state=state')).resolves.toEqual({ returnTo: '/admin/apps' })
    expect(writes).toHaveBeenCalledOnce()
    expect(JSON.parse(writes.mock.calls[0][1])).toMatchObject({
      accessToken: 'oauth-token',
      refreshToken: 'oauth-refresh',
      username: 'alice'
    })
    expect(userApis.getSignedInUser).toHaveBeenCalledExactlyOnceWith('oauth-token')
    expect(signedIn.username).toBe('alice')
    expect(JSON.parse(localStorage.getItem('builder-user')!).refreshToken).toBe('oauth-refresh')
  })

  it('signs out after a successful username change', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue(user('renamed'))
    const updated = await signedIn.modifyUsername('renamed')
    expect(updated.username).toBe('renamed')
    expect(signedIn.isSignedIn()).toBe(false)
    expect(signedIn.user).toBeNull()
    expect(JSON.parse(localStorage.getItem('builder-user')!).accessToken).toBeNull()
  })

  it('shares a rotated token between callers queued on the origin lock', async () => {
    let tail = Promise.resolve()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, fn: () => Promise<void>) => {
          const request = tail.then(fn)
          tail = request.catch(() => {})
          return request
        }
      }
    })
    credentials('alice', true)
    const refresh = vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockResolvedValue({
      access_token: 'shared-token',
      refresh_token: 'rotated',
      expires_in: 3600,
      token_type: 'Bearer'
    })
    const signedIn = create()
    const values = await Promise.all([signedIn.ensureAccessToken(), signedIn.ensureAccessToken()])
    expect(values).toEqual(['shared-token', 'shared-token'])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it.each([null, 'alice'])(
    'commits token and username together after validating a new user from %s',
    async (username) => {
      if (username == null) localStorage.clear()
      const signedIn = create()
      install(signedIn)
      await flushPromises()
      const stored = localStorage.getItem('builder-user')
      const state = signedIn.state.data.value
      const pending = deferred<SignedInUser>()
      const writes = vi.spyOn(localStorage, 'setItem')
      vi.mocked(userApis.getSignedInUser).mockClear().mockReturnValueOnce(pending.promise)
      const signingIn = mockCompleteSignIn(signedIn, 'bob-token')
      await flushPromises()
      expect(localStorage.getItem('builder-user')).toBe(stored)
      expect(signedIn.state.data.value).toBe(state)
      expect(writes).not.toHaveBeenCalled()
      pending.resolve(user('bob'))
      await signingIn
      expect(writes).toHaveBeenCalledOnce()
      expect(JSON.parse(writes.mock.calls[0][1])).toMatchObject({ accessToken: 'bob-token', username: 'bob' })
      expect(signedIn.user).toEqual(user('bob'))
      expect(userApis.getSignedInUser).toHaveBeenCalledExactlyOnceWith('bob-token')
    }
  )

  it('synchronizes an accepted account to another app without an intermediate incomplete identity', async () => {
    const first = create()
    const second = create()
    install(first)
    install(second)
    await flushPromises()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(first, 'bob-token')
    const stored = JSON.parse(localStorage.getItem('builder-user')!)
    expect(stored).toMatchObject({ accessToken: 'bob-token', username: 'bob' })
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    expect(first.username).toBe('bob')
    expect(second.username).toBe('bob')
  })

  it('does not accept a pending sign-in after sign-out', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const signingIn = mockCompleteSignIn(signedIn, 'bob-token')
    const rejected = expect(signingIn).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    await signedIn.signOut()
    pending.resolve(user('bob'))
    await rejected
    expect(signedIn.isSignedIn()).toBe(false)
    expect(JSON.parse(localStorage.getItem('builder-user')!).accessToken).toBeNull()
  })

  it('does not overwrite a newer accepted account with a late sign-in response', async () => {
    const signedIn = create()
    install(signedIn)
    await flushPromises()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise).mockResolvedValue(user('charlie'))
    const oldSignIn = mockCompleteSignIn(signedIn, 'bob-token')
    const rejected = expect(oldSignIn).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    await mockCompleteSignIn(signedIn, 'charlie-token')
    pending.resolve(user('bob'))
    await rejected
    expect(signedIn.username).toBe('charlie')
    expect(JSON.parse(localStorage.getItem('builder-user')!).accessToken).toBe('charlie-token')
  })

  it('maintains independent state for separate app instances', async () => {
    const first = create()
    const second = create()
    install(first)
    install(second)
    await flushPromises()
    await first.updateProfile({ displayName: 'Updated' })
    expect(first.user?.displayName).toBe('Updated')
    expect(second.user?.displayName).toBe('alice')
  })
})
