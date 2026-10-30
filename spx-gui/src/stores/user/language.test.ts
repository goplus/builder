import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createI18n, type Lang } from '@/utils/i18n'
import { ActionException } from '@/utils/exception'
import * as userApis from '@/apis/user'
import { initUserState } from './signed-in'
import { makeSignedInState } from './test'
import { useSetPreferredLanguage, useSyncUserLanguage } from './language'

function makeUser(username: string, preferredLanguage: Lang): userApis.SignedInUser {
  const state = makeSignedInState(username)
  if (!state.isSignedIn) throw new Error('Expected signed-in fixture')
  return { ...state.user, id: username, preferredLanguage }
}

function restoreSession(username: string | null) {
  localStorage.setItem(
    'builder-user',
    JSON.stringify({
      username,
      accessToken: username == null ? null : `token-${username}`,
      accessTokenExpiresAt: null,
      refreshToken: null
    })
  )
  window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
}

describe('account language preference', () => {
  const cleanups: (() => void)[] = []

  beforeEach(() => {
    localStorage.clear()
    initUserState('test-client')
    vi.spyOn(userApis, 'getSignedInUser')
    vi.spyOn(userApis, 'updateSignedInUser')
  })

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    restoreSession(null)
    vi.restoreAllMocks()
  })

  function mountLanguage(initialLanguage: Lang = 'en') {
    const i18n = createI18n({ lang: initialLanguage })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let setLanguage!: ReturnType<typeof useSetPreferredLanguage>
    const app = createApp({
      setup() {
        useSyncUserLanguage()
        setLanguage = useSetPreferredLanguage()
        return () => i18n.lang.value
      }
    })
    app.use(i18n).use(VueQueryPlugin, { queryClient })
    const element = document.createElement('div')
    app.mount(element)
    cleanups.push(() => {
      app.unmount()
      queryClient.clear()
    })
    return { i18n, setLanguage, queryClient, element }
  }

  it('restores the account preference without writing it back', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'zh'))
    const { element } = mountLanguage()
    await vi.waitFor(() => expect(element.textContent).toBe('zh'))
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('leaves guest language unchanged and restores a different account', async () => {
    const { element } = mountLanguage('zh')
    await nextTick()
    expect(element.textContent).toBe('zh')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    restoreSession('alice')
    await vi.waitFor(() => expect(element.textContent).toBe('en'))
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('bob', 'zh'))
    restoreSession('bob')
    await vi.waitFor(() => expect(element.textContent).toBe('zh'))
    expect(userApis.updateSignedInUser).not.toHaveBeenCalled()
  })

  it('switches immediately, saves explicitly, and ignores stale profile refetches', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, setLanguage, queryClient } = mountLanguage('zh')
    await vi.waitFor(() => expect(i18n.lang.value).toBe('en'))
    let resolveSave!: (user: userApis.SignedInUser) => void
    vi.mocked(userApis.updateSignedInUser).mockImplementation(() => new Promise((resolve) => (resolveSave = resolve)))
    const save = setLanguage('zh')
    expect(i18n.lang.value).toBe('zh')
    expect(userApis.updateSignedInUser).toHaveBeenCalledExactlyOnceWith({ preferredLanguage: 'zh' })
    await queryClient.invalidateQueries()
    expect(i18n.lang.value).toBe('zh')
    resolveSave(makeUser('alice', 'zh'))
    await save
    await nextTick()
    expect(i18n.lang.value).toBe('zh')
  })

  it('keeps the local selection and reports a failed save', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, setLanguage } = mountLanguage('zh')
    await vi.waitFor(() => expect(i18n.lang.value).toBe('en'))
    vi.mocked(userApis.updateSignedInUser).mockRejectedValue(new Error('offline'))
    await expect(setLanguage('zh')).rejects.toBeInstanceOf(ActionException)
    expect(i18n.lang.value).toBe('zh')
  })

  it('does not apply a completed save to a different account', async () => {
    restoreSession('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('alice', 'en'))
    const { i18n, setLanguage } = mountLanguage('zh')
    await vi.waitFor(() => expect(i18n.lang.value).toBe('en'))
    let resolveSave!: (user: userApis.SignedInUser) => void
    vi.mocked(userApis.updateSignedInUser).mockImplementation(() => new Promise((resolve) => (resolveSave = resolve)))
    const save = setLanguage('zh')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue(makeUser('bob', 'en'))
    restoreSession('bob')
    await vi.waitFor(() => expect(i18n.lang.value).toBe('en'))
    resolveSave(makeUser('alice', 'zh'))
    await save
    expect(i18n.lang.value).toBe('en')
  })
})
