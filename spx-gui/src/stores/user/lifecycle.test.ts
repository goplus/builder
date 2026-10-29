import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, watch, watchEffect } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { untilLoaded, useQuery, type QueryRet } from '@/utils/query'
import { Cancelled } from '@/utils/exception'
import { OAuthFlow } from '@/utils/oauth'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import { initSignedIn, useSignedIn, type SignedIn, type SignedInUser } from './signed-in'
import { useUser } from './index'
import { createSignedIn, makeSignedInUser, mockCompleteSignIn } from './test'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function user(username: string) {
  return makeSignedInUser(username)!
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
const userQueries = new WeakMap<SignedIn, QueryRet<SignedInUser | null>>()
function getUserQuery(signedIn: SignedIn) {
  return userQueries.get(signedIn)!
}
function install(setup: (signedIn: SignedIn) => void = () => {}) {
  let signedIn!: SignedIn
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(
    defineComponent({
      setup() {
        userQueries.set(
          signedIn,
          useQuery(({ signal }) => signedIn.getUser({ signal }))
        )
        setup(signedIn)
        return () => null
      }
    }),
    {
      global: {
        plugins: [
          createI18n({ lang: 'en' }),
          [VueQueryPlugin, { queryClient }],
          {
            install(app) {
              signedIn = initSignedIn(app, { oauthClientId: 'test' })
              instances.push(signedIn)
            }
          }
        ]
      }
    }
  )
  return { signedIn, wrapper }
}
const instances: SignedIn[] = []
function create() {
  const signedIn = createSignedIn({ oauthClientId: 'test' })
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
  it('automatically loads user information, shares pending requests and caches successes', async () => {
    const signedIn = create()
    expect(signedIn.isSignedIn).toBe(true)
    expect(signedIn.username).toBe('alice')
    expect(signedIn.user).toBeNull()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
    const first = signedIn.getUser()
    const second = signedIn.getUser()
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
    pending.resolve(user('alice'))
    const [a, b] = await Promise.all([first, second])
    expect(a).toBe(b)
    expect(signedIn.user).toBe(a)
    expect(await signedIn.getUser()).toBe(a)
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
    await signedIn.signOut()
    expect(await signedIn.getUser()).toBeNull()
  })

  it('loads user information after an identity change without any profile-query consumer', async () => {
    const signedIn = create()
    await flushPromises()
    expect(signedIn.user?.username).toBe('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    expect(signedIn.user).toBeNull()
    await flushPromises()
    expect(signedIn.user?.username).toBe('bob')
    expect(userApis.getSignedInUser).toHaveBeenCalledTimes(2)
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledTimes(2)
    await signedIn.signOut()
    expect(signedIn.user).toBeNull()
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledTimes(2)
  })

  it('loads the final identity after multiple storage changes in the same tick', async () => {
    const signedIn = create()
    await flushPromises()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    credentials('alice')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    pending.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.user?.username).toBe('alice')
    expect(signedIn.isSignedIn).toBe(true)
  })

  it('captures automatic load failures and allows an explicit retry', async () => {
    vi.mocked(userApis.getSignedInUser).mockRejectedValueOnce(new Error('offline'))
    const signedIn = create()
    await flushPromises()
    expect(signedIn.user).toBeNull()
    expect(signedIn.isSignedIn).toBe(true)
    expect(await signedIn.getUser()).toEqual(user('alice'))
    expect(signedIn.user?.username).toBe('alice')
  })

  it('keeps a shared request available when one consumer cancels', async () => {
    const signedIn = create()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const ctrl = new AbortController()
    const first = signedIn.getUser({ signal: ctrl.signal })
    const cancelled = expect(first).rejects.toBeInstanceOf(Cancelled)
    const second = signedIn.getUser()
    ctrl.abort(new Cancelled('consumer unmounted'))
    pending.resolve(user('alice'))
    await cancelled
    expect(await second).toEqual(user('alice'))
    expect(await signedIn.getUser()).toEqual(user('alice'))
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
  })

  it('shares one load and provides the same instance to consumers', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValue(pending.promise)
    const { signedIn } = install((signedIn) => {
      expect(useSignedIn()).toBe(signedIn)
      expect(useSignedIn()).toBe(signedIn)
    })
    expect(signedIn.isSignedIn).toBe(true)
    expect(signedIn.username).toBe('alice')
    expect(getUserQuery(signedIn).data.value).toBeNull()
    getUserQuery(signedIn).refetch()
    getUserQuery(signedIn).refetch()
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
    pending.resolve(user('alice'))
    await untilLoaded(getUserQuery(signedIn))
    expect(signedIn.isSignedIn).toBe(true)
  })

  it('signs out instead of caching or returning a user with a different username', async () => {
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('renamed'))
    const signedIn = create()
    await expect(signedIn.getUser()).rejects.toBeInstanceOf(Cancelled)
    expect(signedIn.isSignedIn).toBe(false)
    expect(signedIn.username).toBeNull()
    expect(localStorage.getItem('builder-user')).toBeNull()
    expect(await signedIn.getUser()).toBeNull()
    expect(await signedIn.ensureAccessToken()).toBeNull()
    expect(accountOAuthApisForXBuilder.revokeToken).toHaveBeenCalledWith({ client_id: 'test', token: 'alice-token' })
    expect(accountOAuthApisForXBuilder.revokeToken).toHaveBeenCalledWith({ client_id: 'test', token: 'alice-refresh' })
  })

  it('publishes sign-out to identity and profile consumers when the returned username changes', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const usernames: Array<string | null> = []
    const { signedIn } = install((signedIn) => watchEffect(() => usernames.push(signedIn.username)))
    expect(usernames).toEqual(['alice'])
    pending.resolve(user('renamed'))
    await untilLoaded(getUserQuery(signedIn))
    await flushPromises()
    expect(usernames).toEqual(['alice', null])
    expect(getUserQuery(signedIn).data.value).toBeNull()
    expect(getUserQuery(signedIn).error.value).toBeNull()
  })

  it.each(['profile', 'avatar'])('signs out when a %s update returns a different username', async (kind) => {
    const { signedIn } = install()
    await untilLoaded(getUserQuery(signedIn))
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue(user('renamed'))
    vi.spyOn(userApis, 'updateSignedInUserAvatar').mockResolvedValue()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('renamed'))
    const updating =
      kind === 'profile'
        ? signedIn.updateProfile({ displayName: 'Updated' })
        : signedIn.updateAvatar(new File(['avatar'], 'avatar.png'))
    await expect(updating).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    expect(signedIn.isSignedIn).toBe(false)
    expect(signedIn.username).toBeNull()
    expect(localStorage.getItem('builder-user')).toBeNull()
    expect(await signedIn.getUser()).toBeNull()
    expect(getUserQuery(signedIn).data.value).toBeNull()
  })

  it('keeps initial errors distinct from signed out and retries', async () => {
    vi.mocked(userApis.getSignedInUser).mockRejectedValueOnce(new TypeError('offline'))
    const { signedIn } = install()
    await flushPromises()
    expect(signedIn.isSignedIn).toBe(true)
    expect(signedIn.username).toBe('alice')
    expect(getUserQuery(signedIn).data.value).toBeNull()
    await expect(untilLoaded(getUserQuery(signedIn))).rejects.toThrow('offline')
    getUserQuery(signedIn).refetch()
    await untilLoaded(getUserQuery(signedIn))
    expect(signedIn.username).toBe('alice')
  })

  it('keeps derived permissions and dependent drafts stable on unrelated profile updates', async () => {
    const admin = { ...user('alice'), capabilities: { ...user('alice').capabilities, canManageAccount: true } }
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(admin)
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue({ ...admin, displayName: 'Updated' })
    const permissionChanges: unknown[] = []
    const draftSignals: AbortSignal[] = []
    let draftQuery!: QueryRet<{ name: string } | null>
    const { signedIn } = install((signedIn) => {
      const canManageAccount = computed(() => signedIn.user?.capabilities.canManageAccount === true)
      watch(canManageAccount, (value) => permissionChanges.push(value), { flush: 'sync' })
      draftQuery = useQuery(async ({ signal }) => {
        if (canManageAccount.value !== true) return null
        draftSignals.push(signal)
        return { name: 'Initial draft' }
      })
    })
    await flushPromises()
    const draft = draftQuery.data.value!
    draft.name = 'Unsaved draft'
    permissionChanges.length = 0
    await signedIn.updateProfile({ displayName: 'Updated' })
    await flushPromises()
    expect(permissionChanges).toEqual([])
    expect(draftSignals).toHaveLength(1)
    expect(draftSignals[0].aborted).toBe(false)
    expect(draftQuery.data.value).toBe(draft)
    expect(draftQuery.data.value?.name).toBe('Unsaved draft')
  })

  it('keeps identity effects stable on profile updates and token rotation', async () => {
    const identities: unknown[] = []
    const { signedIn } = install((signedIn) =>
      watchEffect(() => identities.push([signedIn.isSignedIn, signedIn.username]))
    )
    await flushPromises()
    identities.length = 0
    await signedIn.updateProfile({ displayName: 'Updated' })
    await flushPromises()
    expect(getUserQuery(signedIn).data.value?.displayName).toBe('Updated')
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
    const { signedIn } = install()
    await flushPromises()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(signedIn, 'bob-token')
    old.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.username).toBe('bob')
    expect(getUserQuery(signedIn).isLoading.value).toBe(false)
  })

  it('keeps the new session loading when an old user load finishes', async () => {
    const alice = deferred<SignedInUser>()
    const bob = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(alice.promise).mockReturnValueOnce(bob.promise)
    const { signedIn } = install()
    await flushPromises()
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    alice.resolve(user('alice'))
    await flushPromises()
    expect(signedIn.username).toBe('bob')
    expect(getUserQuery(signedIn).isLoading.value).toBe(true)
    expect(getUserQuery(signedIn).data.value).toBeNull()
    getUserQuery(signedIn).refetch()
    expect(userApis.getSignedInUser).toHaveBeenCalledTimes(2)
    bob.resolve(user('bob'))
    expect(await untilLoaded(getUserQuery(signedIn))).toEqual(user('bob'))
  })

  it('discards late profile mutations after switching accounts', async () => {
    const { signedIn } = install()
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

  it('keeps a profile mutation when an older initial read finishes later', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const { signedIn } = install()
    await flushPromises()
    await signedIn.updateProfile({ displayName: 'Updated' })
    pending.resolve(user('alice'))
    await flushPromises()
    expect(await signedIn.getUser()).toMatchObject({ displayName: 'Updated' })
    expect(getUserQuery(signedIn).data.value?.displayName).toBe('Updated')
  })

  it('does not restore late rotated tokens after sign-out', async () => {
    const { signedIn } = install()
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
    expect(signedIn.isSignedIn).toBe(false)
    expect(localStorage.getItem('builder-user')).toBeNull()
  })

  it('discards an in-flight token refresh after a returned username change signs out', async () => {
    const { signedIn } = install()
    await flushPromises()
    credentials('alice', true)
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    const refresh = deferred<Awaited<ReturnType<typeof accountOAuthApisForXBuilder.refreshToken>>>()
    vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockReturnValue(refresh.promise)
    const refreshing = signedIn.ensureAccessToken()
    const cancelled = expect(refreshing).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue({ ...user('renamed'), displayName: 'Updated' })
    await expect(signedIn.updateProfile({ displayName: 'Updated' })).rejects.toBeInstanceOf(Cancelled)
    refresh.resolve({ access_token: 'rotated', refresh_token: 'rotated-refresh', expires_in: 3600 })
    await cancelled
    await flushPromises()
    expect(signedIn.isSignedIn).toBe(false)
    expect(signedIn.username).toBeNull()
    expect(localStorage.getItem('builder-user')).toBeNull()
    expect(getUserQuery(signedIn).data.value).toBeNull()
  })

  it.each([null, 'alice'])('preserves the %s session when candidate credentials fail validation', async (username) => {
    if (username == null) localStorage.clear()
    const { signedIn } = install()
    await flushPromises()
    const stored = localStorage.getItem('builder-user')
    const state = getUserQuery(signedIn).data.value
    vi.mocked(userApis.getSignedInUser).mockRejectedValueOnce(new TypeError('offline'))
    await expect(mockCompleteSignIn(signedIn, 'candidate-token')).rejects.toThrow('offline')
    expect(localStorage.getItem('builder-user')).toBe(stored)
    expect(getUserQuery(signedIn).data.value).toBe(state)
    expect(getUserQuery(signedIn).isLoading.value).toBe(false)
    expect(getUserQuery(signedIn).error.value).toBeNull()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(user('bob'))
    await mockCompleteSignIn(signedIn, 'candidate-token')
    expect(signedIn.username).toBe('bob')
  })

  it('disposes the listener and ignores pending work on app unmount', async () => {
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const { signedIn, wrapper } = install()
    await flushPromises()
    wrapper.unmount()
    pending.resolve(user('alice'))
    await flushPromises()
    expect(getUserQuery(signedIn).data.value).toBeNull()
    credentials('bob')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await flushPromises()
    expect(userApis.getSignedInUser).toHaveBeenCalledOnce()
  })

  it('updates public profile consumers without reloading its own user', async () => {
    vi.spyOn(userApis, 'getUser').mockResolvedValue(user('alice'))
    let profile!: ReturnType<typeof useUser>
    const { signedIn } = install((signedIn) => {
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
    const { signedIn } = install()
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
    const { signedIn } = install()
    await flushPromises()
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue(user('renamed'))
    const updated = await signedIn.modifyUsername('renamed')
    expect(updated.username).toBe('renamed')
    expect(signedIn.isSignedIn).toBe(false)
    expect(getUserQuery(signedIn).data.value).toBeNull()
    expect(localStorage.getItem('builder-user')).toBeNull()
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
      const { signedIn } = install()
      await flushPromises()
      const stored = localStorage.getItem('builder-user')
      const state = getUserQuery(signedIn).data.value
      const pending = deferred<SignedInUser>()
      const writes = vi.spyOn(localStorage, 'setItem')
      vi.mocked(userApis.getSignedInUser).mockClear().mockReturnValueOnce(pending.promise)
      const signingIn = mockCompleteSignIn(signedIn, 'bob-token')
      await flushPromises()
      expect(localStorage.getItem('builder-user')).toBe(stored)
      expect(getUserQuery(signedIn).data.value).toBe(state)
      expect(writes).not.toHaveBeenCalled()
      pending.resolve(user('bob'))
      await signingIn
      expect(writes).toHaveBeenCalledOnce()
      expect(JSON.parse(writes.mock.calls[0][1])).toMatchObject({ accessToken: 'bob-token', username: 'bob' })
      await flushPromises()
      expect(getUserQuery(signedIn).data.value).toEqual(user('bob'))
      expect(userApis.getSignedInUser).toHaveBeenCalledExactlyOnceWith('bob-token')
    }
  )

  it('synchronizes an accepted account to another app without an intermediate incomplete identity', async () => {
    const { signedIn: first } = install()
    const { signedIn: second } = install()
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
    const { signedIn } = install()
    await flushPromises()
    const pending = deferred<SignedInUser>()
    vi.mocked(userApis.getSignedInUser).mockReturnValueOnce(pending.promise)
    const signingIn = mockCompleteSignIn(signedIn, 'bob-token')
    const rejected = expect(signingIn).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    await signedIn.signOut()
    pending.resolve(user('bob'))
    await rejected
    expect(signedIn.isSignedIn).toBe(false)
    expect(localStorage.getItem('builder-user')).toBeNull()
  })

  it('does not overwrite a newer accepted account with a late sign-in response', async () => {
    const { signedIn } = install()
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
    const { signedIn: first } = install()
    const { signedIn: second } = install()
    await flushPromises()
    await first.updateProfile({ displayName: 'Updated' })
    await flushPromises()
    expect(getUserQuery(first).data.value?.displayName).toBe('Updated')
    expect(getUserQuery(second).data.value?.displayName).toBe('alice')
  })
})
