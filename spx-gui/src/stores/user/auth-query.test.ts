import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount, shallowMount } from '@vue/test-utils'
import { computed, defineComponent, onUnmounted, toValue, ref, watch } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { untilLoaded, useQuery } from '@/utils/query'
import { client } from '@/apis/common'
import { accountOAuthClientForXBuilder } from '@/apis/account/oauth'
import AdminPage from '@/apps/xbuilder/pages/admin/index.vue'
import { createSignedIn, type SignedIn, type SignedInUser } from './signed-in'
import { makeSignedInState, mockCompleteSignIn } from './test'

const { fetchMock } = vi.hoisted(() => {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock }
})

enableAutoUnmount(afterEach)

const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')
let now: number
let serverUser: SignedInUser
let refreshFailure: string | null
let queryClient: QueryClient
let signedIn: SignedIn

function restoreCredentials(username: string | null = 'alice', refreshToken: string | null = 'refresh-token') {
  localStorage.setItem(
    'builder-user',
    JSON.stringify({
      accessToken: username == null ? null : `${username}-access-token`,
      accessTokenExpiresAt: now + 120_000,
      refreshToken: username == null ? null : refreshToken,
      username
    })
  )
  window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
}

function setupQueries() {
  let result!: ReturnType<typeof useQueries>
  function useQueries() {
    const auth = signedIn.state
    const user = computed(() => signedIn.user)
    const observations: unknown[] = []
    watch([auth.data, auth.isLoading, auth.error, user], (values) => observations.push(values), { flush: 'sync' })
    const sessions: { signal: AbortSignal; draft: string }[] = []
    const identity = computed(() => signedIn.username ?? 'guest')
    const session = useQuery(async (ctx) => {
      toValue(identity)
      const state = await untilLoaded(auth, ctx.signal)
      const value = { signal: ctx.signal, draft: state.user?.username ?? 'guest' }
      sessions.push(value)
      return value
    })
    return {
      auth,
      user,
      observations,
      sessions,
      session,
      update: signedIn.updateProfile.bind(signedIn),
      avatar: signedIn.updateAvatar.bind(signedIn)
    }
  }
  mount(
    defineComponent({
      setup() {
        result = useQueries()
        return () => null
      }
    }),
    { global: { plugins: [createI18n({ lang: 'en' }), [VueQueryPlugin, { queryClient }], signedIn] } }
  )
  return result
}

beforeEach(() => {
  now = Date.now()
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  localStorage.clear()
  serverUser = makeSignedInState('alice').user!
  serverUser.capabilities.canManageAccount = true
  refreshFailure = null
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, callback: () => Promise<void>) => {
        await Promise.resolve()
        return callback()
      }
    }
  })
  fetchMock.mockReset().mockImplementation(async (input) => {
    const req = input as Request
    const path = new URL(req.url).pathname
    if (path === '/oauth/token') {
      if (refreshFailure === 'network') throw new TypeError('Failed to fetch')
      if (refreshFailure != null) return Response.json({ error: refreshFailure }, { status: 400 })
      return Response.json({
        access_token: 'rotated-access-token',
        refresh_token: 'rotated-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    }
    if (path === '/oauth/revoke' || path === '/user/avatar') return new Response(null, { status: 204 })
    if (path === '/user') return Response.json(serverUser)
    return Response.json({ displayName: 'Saved name' })
  })
  client.setBaseUrl('https://api.example.com')
  client.setTokenProvider(() => signedIn.ensureAccessToken())
  accountOAuthClientForXBuilder.setBaseUrl('https://account.example.com')
  restoreCredentials()
  signedIn = createSignedIn({ clientId: 'client-id' })
})

afterEach(() => {
  signedIn.dispose()
  queryClient.clear()
  vi.restoreAllMocks()
  if (originalLocks != null) Object.defineProperty(navigator, 'locks', originalLocks)
  else Reflect.deleteProperty(navigator, 'locks')
})
afterAll(() => vi.unstubAllGlobals())

describe('credential reads in business queries (#3588)', () => {
  it.each([false, true])(
    'keeps drafts and explicit inputs reactive (initially expired: %s)',
    async (initiallyExpired) => {
      if (initiallyExpired) now += 65_000
      const appID = ref('first')
      const draft = ref('')
      const signals: AbortSignal[] = []
      mount(
        defineComponent({
          setup() {
            const app = useQuery(async (ctx) => {
              signals.push(ctx.signal)
              return client.get(`/apps/${appID.value}`) as Promise<{ displayName: string }>
            })
            watch(app.data, (value) => {
              if (value != null) draft.value = value.displayName
            })
            return () => null
          }
        })
      )
      await flushPromises()
      expect(draft.value).toBe('Saved name')
      draft.value = 'Unsaved draft'
      now += initiallyExpired ? 3600_000 : 65_000
      await expect(signedIn.ensureAccessToken()).resolves.toBe('rotated-access-token')
      await flushPromises()
      expect(draft.value).toBe('Unsaved draft')
      expect(signals).toHaveLength(1)
      expect(signals[0].aborted).toBe(false)

      appID.value = 'second'
      await flushPromises()
      expect(signals).toHaveLength(2)
      expect(signals[0].aborted).toBe(true)
      const req = fetchMock.mock.calls.at(-1)![0] as Request
      expect(req.url).toBe('https://api.example.com/apps/second')
      expect(req.headers.get('Authorization')).toBe('Bearer rotated-access-token')
    }
  )
})

describe('signed-in state queries (#3590)', () => {
  it('preserves data, loading, errors, and composed session state during same-user refresh', async () => {
    const result = setupQueries()
    await flushPromises()
    expect(result.auth.data.value?.user?.username).toBe('alice')
    expect(fetchMock.mock.calls.filter(([input]) => new URL((input as Request).url).pathname === '/user')).toHaveLength(
      1
    )
    const session = result.session.data.value!
    session.draft = 'Learning edits'
    const state = result.auth.data.value
    const user = result.user.value
    result.observations.length = 0
    const userRequests = fetchMock.mock.calls.filter(
      ([input]) => new URL((input as Request).url).pathname === '/user'
    ).length

    now += 65_000
    await expect(signedIn.ensureAccessToken()).resolves.toBe('rotated-access-token')
    await flushPromises()

    expect(result.observations).toEqual([])
    expect(result.auth.data.value).toBe(state)
    expect(result.user.value).toBe(user)
    expect(result.sessions).toHaveLength(1)
    expect(result.session.data.value).toBe(session)
    expect(session).toMatchObject({ draft: 'Learning edits' })
    expect(session.signal.aborted).toBe(false)
    expect(fetchMock.mock.calls.filter(([input]) => new URL((input as Request).url).pathname === '/user')).toHaveLength(
      userRequests
    )
    restoreCredentials()
    await flushPromises()
    expect(result.observations).toEqual([])
    expect(result.session.data.value).toBe(session)
  })

  it('handles sign-out, sign-in, account switching, and same-user sign-in', async () => {
    const result = setupQueries()
    await flushPromises()
    await signedIn.signOut()
    await flushPromises()
    expect(result.auth.data.value).toEqual({ isSignedIn: false, user: null })
    expect(result.user.value).toBeNull()
    await mockCompleteSignIn(signedIn, 'alice-new-session')
    await flushPromises()
    expect(result.user.value?.username).toBe('alice')
    serverUser = makeSignedInState('bob').user!
    await mockCompleteSignIn(signedIn, 'bob-access-token')
    await flushPromises()
    expect(result.auth.data.value?.user?.username).toBe('bob')
  })

  it('checks elapsed expiry without a refresh token when explicitly refetched', async () => {
    restoreCredentials('alice', null)
    const result = setupQueries()
    await flushPromises()
    expect(result.auth.data.value?.isSignedIn).toBe(true)
    now += 65_000
    signedIn.reload()
    await flushPromises()
    expect(result.auth.data.value).toEqual({ isSignedIn: false, user: null })
    await mockCompleteSignIn(signedIn, 'alice-new-session')
    await flushPromises()
    expect(result.auth.data.value?.user?.username).toBe('alice')
    await signedIn.signOut()
    await expect(signedIn.ensureAccessToken()).resolves.toBeNull()
    await flushPromises()
    expect(result.user.value).toBeNull()
  })

  it('starts signed out when credentials have already expired without a refresh token', async () => {
    restoreCredentials('alice', null)
    now += 65_000
    const result = setupQueries()
    await flushPromises()
    expect(result.auth.data.value).toEqual({ isSignedIn: false, user: null })
    expect(result.auth.error.value).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports initial profile errors and recovers on explicit refetch', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const result = setupQueries()
    await flushPromises()
    expect(result.auth.error.value).not.toBeNull()
    expect(result.auth.data.value).toBeNull()
    expect(result.user.value).toBeNull()
    expect(JSON.parse(localStorage.getItem('builder-user')!).username).toBe('alice')
    signedIn.reload()
    await flushPromises()
    expect(result.auth.error.value).toBeNull()
    expect(result.user.value?.username).toBe('alice')
  })

  it.each(['network', 'server_error', 'invalid_grant'])('handles refresh failure %s', async (failure) => {
    const result = setupQueries()
    await flushPromises()
    const state = result.auth.data.value
    result.observations.length = 0
    refreshFailure = failure
    now += 65_000
    if (failure === 'invalid_grant') await expect(signedIn.ensureAccessToken()).resolves.toBeNull()
    else await expect(signedIn.ensureAccessToken()).rejects.toThrow()
    await flushPromises()
    if (failure === 'invalid_grant') {
      expect(result.auth.data.value).toEqual({ isSignedIn: false, user: null })
      expect(result.user.value).toBeNull()
    } else {
      expect(result.observations).toEqual([])
      expect(result.auth.data.value).toBe(state)
      expect(result.auth.data.value?.isSignedIn).toBe(true)
    }
  })

  it.each(['network', 'server_error', 'invalid_grant'])(
    'handles refresh failure %s while loading the initial signed-in state',
    async (failure) => {
      refreshFailure = failure
      now += 65_000
      const result = setupQueries()
      await flushPromises()
      if (failure === 'invalid_grant') {
        expect(result.auth.data.value).toEqual({ isSignedIn: false, user: null })
        expect(result.auth.error.value).toBeNull()
        expect(JSON.parse(localStorage.getItem('builder-user')!).username).toBeNull()
      } else {
        expect(result.auth.data.value).toBeNull()
        expect(result.auth.error.value).not.toBeNull()
        expect(JSON.parse(localStorage.getItem('builder-user')!).username).toBe('alice')
        refreshFailure = null
        signedIn.reload()
        await flushPromises()
        expect(result.auth.error.value).toBeNull()
        expect(result.user.value?.username).toBe('alice')
      }
    }
  )

  it('propagates profile, avatar, and capability changes directly to consumers', async () => {
    const result = setupQueries()
    await flushPromises()
    serverUser = {
      ...serverUser,
      displayName: 'New display name',
      capabilities: { ...serverUser.capabilities, canManageCourses: true }
    }
    await result.update({ displayName: serverUser.displayName })
    await flushPromises()
    await vi.waitFor(() => expect(result.user.value?.displayName).toBe('New display name'))
    expect(result.auth.data.value?.user?.capabilities.canManageCourses).toBe(true)
    serverUser = { ...serverUser, avatar: 'https://example.com/new-avatar.png' }
    await result.avatar(new File(['avatar'], 'avatar.png', { type: 'image/png' }))
    await flushPromises()
    await vi.waitFor(() => expect(result.user.value?.avatar).toBe(serverUser.avatar))
  })

  it('keeps the actual admin routed draft mounted during refresh', async () => {
    const unmounted = vi.fn()
    const DraftPage = defineComponent({
      name: 'DraftPage',
      setup() {
        const draft = ref('')
        onUnmounted(unmounted)
        return { draft }
      },
      template: '<input v-model="draft" />'
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/admin/apps/app', component: DraftPage }]
    })
    await router.push('/admin/apps/app')
    const page = shallowMount(AdminPage, {
      global: {
        plugins: [router, createI18n({ lang: 'en' }), [VueQueryPlugin, { queryClient }], signedIn],
        renderStubDefaultSlot: true,
        stubs: { RouterView: false, DraftPage: false },
        directives: { radar: {} }
      }
    })
    await flushPromises()
    await page.get('input').setValue('Unsaved admin draft')
    now += 65_000
    await signedIn.ensureAccessToken()
    await flushPromises()
    expect(unmounted).not.toHaveBeenCalled()
    expect((page.get('input').element as HTMLInputElement).value).toBe('Unsaved admin draft')
  })
})
