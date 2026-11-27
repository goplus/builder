import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n, type Lang } from '@/utils/i18n'
import { ActionException, Cancelled } from '@/utils/exception'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import * as userApis from '@/apis/user'
import { UIConfigProvider, UIMessageProvider } from '@/components/ui'
import NavbarProfile from '@/components/navbar/NavbarProfile.vue'
import { initSignedIn, type SignedIn } from './signed-in'
import { createSignedIn, makeSignedInUser, mockCompleteSignIn } from './test'

vi.mock('@/components/asset', () => ({
  useAssetLibraryManagement: () => vi.fn()
}))
vi.mock('@/components/feedback', () => ({
  useSendFeedback: () => vi.fn()
}))

function makeUser(username: string, preferredLanguage?: Lang): userApis.SignedInUser {
  const user: userApis.SignedInUser = { ...makeSignedInUser(username)!, id: username }
  if (preferredLanguage != null) user.preferredLanguage = preferredLanguage
  return user
}

function restoreSession(username: string, expiresInMs = 3_600_000) {
  localStorage.setItem(
    'builder-user',
    JSON.stringify({
      username,
      accessToken: `token-${username}`,
      accessTokenExpiresAt: Date.now() + expiresInMs,
      refreshToken: null
    })
  )
  window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
}

describe('account language preference', () => {
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')
  const cleanups: (() => void)[] = []

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(userApis, 'getSignedInUser')
    vi.spyOn(userApis, 'updateSignedInUser')
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_name: string, fn: () => Promise<void>) => fn()
      }
    })
  })

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    localStorage.clear()
    vi.restoreAllMocks()
    if (originalLocks != null) Object.defineProperty(navigator, 'locks', originalLocks)
    else Reflect.deleteProperty(navigator, 'locks')
  })

  function setupLanguage(initialLanguage: Lang = 'en') {
    const i18n = createI18n({ lang: initialLanguage })
    const signedIn = createSignedIn({ oauthClientId: 'test-client' }, i18n)
    cleanups.push(() => signedIn.dispose())
    return { i18n, signedIn }
  }

  it('restores the account preference on reload without writing it back', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, signedIn } = setupLanguage('zh')
    await signedIn.getUser()
    expect(i18n.lang.value).toBe('en')
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('keeps the current local language when account preference is unset on reload or sign-in', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice'))
    const { i18n, signedIn } = setupLanguage('zh')
    await signedIn.getUser()
    expect(i18n.lang.value).toBe('zh')

    await mockCompleteSignIn(signedIn, 'alice-token')
    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('does not invalidate the public user query when saving preferred language', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue(makeUser('alice', 'zh'))
    const invalidateQueries = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    const { i18n, signedIn } = setupLanguage('en')
    await signedIn.getUser()

    await signedIn.setPreferredLanguage('zh')
    expect(i18n.lang.value).toBe('zh')
    expect(signedIn.user?.preferredLanguage).toBe('zh')
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('leaves guest language unchanged and restores a different account', async () => {
    const { i18n, signedIn } = setupLanguage('zh')
    expect(i18n.lang.value).toBe('zh')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    restoreSession('alice')
    await signedIn.getUser()
    expect(i18n.lang.value).toBe('en')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('bob', 'zh'))
    restoreSession('bob')
    await signedIn.getUser()
    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('restores the preference when completing sign-in, including the same account', async () => {
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'zh'))
    const { i18n, signedIn } = setupLanguage()
    await mockCompleteSignIn(signedIn, 'alice-token')
    expect(i18n.lang.value).toBe('zh')
    i18n.setLang('en')
    await mockCompleteSignIn(signedIn, 'alice-token')
    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('switches immediately, ignores a slower initial read, and preserves selection across profile updates', async () => {
    restoreSession('alice')
    let resolveInitialRead!: (user: userApis.SignedInUser) => void
    vi.mocked(userApis.getSignedInUser).mockImplementationOnce(
      () => new Promise((resolve) => (resolveInitialRead = resolve))
    )
    const { i18n, signedIn } = setupLanguage('en')
    await flushPromises()
    let resolveSave!: (user: userApis.SignedInUser) => void
    vi.mocked(userApis.updateSignedInUser).mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve))
    )

    const save = signedIn.setPreferredLanguage('zh')
    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).toHaveBeenCalledExactlyOnceWith({ preferredLanguage: 'zh' })

    resolveInitialRead(makeUser('alice', 'en'))
    await flushPromises()
    expect(i18n.lang.value).toBe('zh')

    vi.mocked(userApis.updateSignedInUser).mockResolvedValue({ ...makeUser('alice', 'en'), displayName: 'Updated' })
    await signedIn.updateProfile({ displayName: 'Updated' })
    expect(i18n.lang.value).toBe('zh')

    resolveSave({ ...makeUser('alice', 'zh'), displayName: 'Updated' })
    await save
    expect(signedIn.user?.preferredLanguage).toBe('zh')
    expect(i18n.lang.value).toBe('zh')
  })

  it('keeps the local selection and reports a failed save', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, signedIn } = setupLanguage()
    await signedIn.getUser()
    vi.mocked(userApis.updateSignedInUser).mockRejectedValue(new Error('offline'))
    await expect(signedIn.setPreferredLanguage('zh')).rejects.toBeInstanceOf(ActionException)
    expect(i18n.lang.value).toBe('zh')
    expect(signedIn.user?.preferredLanguage).toBe('en')
  })

  it('reports a failed save when the session expires during saving instead of swallowing as Cancelled', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    restoreSession('alice', 120_000)
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, signedIn } = setupLanguage()
    await signedIn.getUser()

    now += 120_000
    vi.mocked(userApis.updateSignedInUser).mockImplementationOnce(async () => {
      await signedIn.ensureAccessToken()
      throw new ApiException(ApiExceptionCode.errorUnauthorized, 'unauthorized', {
        req: new Request('https://api.example.com/user', { method: 'PATCH' })
      })
    })

    await expect(signedIn.setPreferredLanguage('zh')).rejects.toBeInstanceOf(ActionException)
    expect(i18n.lang.value).toBe('zh')
    expect(signedIn.isSignedIn).toBe(false)
  })

  it('allows switching language from NavbarProfile even when initial profile loading failed', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockRejectedValue(new Error('offline'))
    vi.mocked(userApis.updateSignedInUser).mockResolvedValue(makeUser('alice', 'zh'))

    const i18n = createI18n({ lang: 'en' })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => null } }]
    })
    let signedIn!: SignedIn
    const wrapper = mount(
      {
        components: { UIConfigProvider, UIMessageProvider, NavbarProfile },
        template: '<UIConfigProvider><UIMessageProvider><NavbarProfile /></UIMessageProvider></UIConfigProvider>'
      },
      {
        attachTo: document.body,
        global: {
          plugins: [
            i18n,
            router,
            [VueQueryPlugin, { queryClient }],
            {
              install(app) {
                signedIn = initSignedIn(app, { oauthClientId: 'test-client' })
              }
            }
          ],
          stubs: { transition: false, 'transition-group': false },
          directives: { radar: {} }
        }
      }
    )
    cleanups.push(() => {
      wrapper.unmount()
      queryClient.clear()
    })

    await flushPromises()
    expect(signedIn.isSignedIn).toBe(true)
    expect(signedIn.user).toBeNull()

    await wrapper.get('img').trigger('click')
    await flushPromises()
    const items = Array.from(document.body.querySelectorAll('.ui-menu-item'))
    const langItem = items.find((el) => el.textContent?.includes('Language')) as HTMLElement | undefined
    expect(langItem).toBeDefined()
    langItem!.click()
    await flushPromises()

    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).toHaveBeenCalledExactlyOnceWith({ preferredLanguage: 'zh' })
  })

  it.each(['resolve', 'reject'])('discards a save that %ss after switching accounts', async (outcome) => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, signedIn } = setupLanguage()
    await signedIn.getUser()
    let finishSave!: () => void
    vi.mocked(userApis.updateSignedInUser).mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          finishSave = () => (outcome === 'resolve' ? resolve(makeUser('alice', 'zh')) : reject(new Error('offline')))
        })
    )
    const cancelled = expect(signedIn.setPreferredLanguage('zh')).rejects.toBeInstanceOf(Cancelled)
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('bob', 'en'))
    restoreSession('bob')
    await signedIn.getUser()
    expect(i18n.lang.value).toBe('en')
    finishSave()
    await cancelled
    expect(i18n.lang.value).toBe('en')
    expect(signedIn.user).toEqual(makeUser('bob', 'en'))
  })

  it('ignores an old profile load after a new account has signed in', async () => {
    restoreSession('alice')
    let resolveLoad!: (user: userApis.SignedInUser) => void
    vi.mocked(userApis.getSignedInUser).mockImplementationOnce(() => new Promise((resolve) => (resolveLoad = resolve)))
    const { i18n, signedIn } = setupLanguage()
    const cancelled = expect(signedIn.getUser()).rejects.toBeInstanceOf(Cancelled)
    await vi.waitFor(() => expect(userApis.getSignedInUser).toHaveBeenCalledOnce())
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('bob', 'en'))
    await mockCompleteSignIn(signedIn, 'bob-token')
    resolveLoad(makeUser('alice', 'zh'))
    await cancelled
    expect(i18n.lang.value).toBe('en')
    expect(signedIn.user).toEqual(makeUser('bob', 'en'))
  })
})
