import { createApp, h, nextTick, ref, watch, type App } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { type QueryMode } from '@/utils/query'
import * as userApis from '@/apis/user'
import * as projectApis from '@/apis/project'
import OwnProject from '@/apps/xbuilder/pages/editor/own-project.vue'
import { useIsFollowing, useFollow, useUnfollow } from './following'
import { useIsLikingProject, useLikeProject, useUnlikeProject } from './liking'
import { initUserState, useSignedInStateQuery, useSignedInUser, useUser } from './user'
import { getUserQueryKey } from './user/query-keys'
import { makeSignedInState } from './user/test'

const apps: App[] = []
const clients: QueryClient[] = []

beforeAll(() => initUserState('test-client'))
afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount())
  clients.splice(0).forEach((client) => client.clear())
  vi.restoreAllMocks()
  setUser(null)
})

function setUser(username: string | null) {
  if (username == null) localStorage.removeItem('builder-user')
  else
    localStorage.setItem(
      'builder-user',
      JSON.stringify({ username, accessToken: 'token', accessTokenExpiresAt: null, refreshToken: 'refresh' })
    )
  window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
}

function user(username: string) {
  return makeSignedInState(username).user!
}

function setup<T>(fn: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  let value!: T
  const app = createApp({
    setup: () => {
      value = fn()
      return () => null
    }
  })
  app.use(VueQueryPlugin, { queryClient: client })
  app.mount(document.createElement('div'))
  apps.push(app)
  return { client, value }
}

describe('cached store consumers', () => {
  it('waits for valid signed-in data before the own-project redirect', async () => {
    setUser('alice')
    let finish!: (value: userApis.SignedInUser) => void
    vi.spyOn(userApis, 'getSignedInUser').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    clients.push(client)
    const queryKey = [...getUserQueryKey('alice'), 'signed-in']
    client.setQueryData(queryKey, user('outdated'))
    await client.invalidateQueries({ queryKey })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/editor/:projectNameInput', component: OwnProject, props: true },
        { path: '/editor/:owner/:project', component: { render: () => null } }
      ]
    })
    await router.push('/editor/game?publish=1')
    await router.isReady()
    const app = createApp({ render: () => h(RouterView) })
    app.use(router)
    app.use(createI18n({ lang: 'en' }))
    app.use(VueQueryPlugin, { queryClient: client })
    app.mount(document.createElement('div'))
    apps.push(app)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/editor/game')
    finish(user('alice'))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/editor/alice/game')
    expect(router.currentRoute.value.query).toHaveProperty('publish')
  })

  it('propagates background profile updates to signed-in state, derived user and rendered UI', async () => {
    setUser('alice')
    vi.spyOn(userApis, 'getSignedInUser').mockResolvedValue(user('alice'))
    const { client, value: state } = setup(() => useSignedInStateQuery())
    let displayed!: ReturnType<typeof useSignedInUser>
    const app = createApp({
      setup: () => {
        displayed = useSignedInUser()
        return () => h('span', displayed.value?.displayName ?? 'loading')
      }
    })
    app.use(VueQueryPlugin, { queryClient: client })
    const element = document.createElement('div')
    app.mount(element)
    apps.push(app)
    await flushPromises()
    expect(element.textContent).toBe('alice')
    client.setQueryData([...getUserQueryKey('alice'), 'signed-in'], { ...user('alice'), displayName: 'Alice updated' })
    await nextTick()
    expect(state.data.value?.user?.displayName).toBe('Alice updated')
    expect(displayed.value?.displayName).toBe('Alice updated')
    expect(element.textContent).toBe('Alice updated')
  })

  it.each(['background', 'blocking', 'snapshot'] as QueryMode[])(
    'passes %s through signed-in hooks and resets on user key changes',
    async (mode) => {
      setUser('alice')
      vi.spyOn(userApis, 'getSignedInUser').mockImplementation(async () => user('bob'))
      let finish!: (value: userApis.SignedInUser) => void
      const { client, value } = setup(() => {
        const state = useSignedInStateQuery(mode)
        const derived = useSignedInUser(mode)
        return { state, derived }
      })
      await flushPromises()
      const initial = value.state.data.value
      client.setQueryData([...getUserQueryKey('alice'), 'signed-in'], { ...user('bob'), displayName: 'Changed' })
      expect(value.derived.value?.displayName).toBe(mode === 'snapshot' ? 'bob' : 'Changed')
      vi.mocked(userApis.getSignedInUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      const refresh = client.invalidateQueries({ queryKey: [...getUserQueryKey('alice'), 'signed-in'] })
      await vi.waitFor(() => expect(userApis.getSignedInUser).toHaveBeenCalledTimes(2))
      expect(value.state.isLoading.value).toBe(mode === 'blocking')
      if (mode === 'snapshot') expect(value.state.data.value).toEqual(initial)
      if (mode === 'blocking') expect(value.derived.value).toBe(null)
      finish(user('alice'))
      await refresh
      setUser('bob')
      await nextTick()
      if (mode !== 'background') {
        expect(value.state.data.value).toBe(null)
        expect(value.state.isLoading.value).toBe(true)
      }
      finish(user('bob'))
      await flushPromises()
      expect(value.derived.value?.username).toBe('bob')
      setUser(null)
      expect(value.state.data.value).toEqual({ isSignedIn: false, user: null })
      expect(value.state.error.value).toBe(null)
      expect(value.state.isLoading.value).toBe(false)
    }
  )

  it('preserves a snapshot-initialized form draft while background displays continue updating', async () => {
    vi.spyOn(userApis, 'getUser').mockResolvedValue(user('alice'))
    const { client, value } = setup(() => {
      const initial = useUser(() => 'alice', 'snapshot')
      const display = useUser(() => 'alice')
      const draft = ref('')
      watch(initial.data, (value) => {
        if (value != null) draft.value = value.displayName
      })
      return { initial, display, draft }
    })
    await flushPromises()
    expect(value.draft.value).toBe('alice')
    value.draft.value = 'unsaved edit'
    client.setQueryData(getUserQueryKey('alice'), { ...user('alice'), displayName: 'server update' })
    await nextTick()
    expect(value.draft.value).toBe('unsaved edit')
    expect(value.initial.data.value?.displayName).toBe('alice')
    expect(value.display.data.value?.displayName).toBe('server update')
  })

  it('keeps follow/like actions observable through background cache writes', async () => {
    setUser('alice')
    vi.spyOn(userApis, 'getSignedInUser').mockResolvedValue(user('alice'))
    let followed = false,
      liked = false
    vi.spyOn(userApis, 'isFollowing').mockImplementation(async () => followed)
    vi.spyOn(projectApis, 'isLiking').mockImplementation(async () => liked)
    vi.spyOn(userApis, 'follow').mockImplementation(async () => {
      followed = true
    })
    vi.spyOn(userApis, 'unfollow').mockImplementation(async () => {
      followed = false
    })
    vi.spyOn(projectApis, 'likeProject').mockImplementation(async () => {
      liked = true
    })
    vi.spyOn(projectApis, 'unlikeProject').mockImplementation(async () => {
      liked = false
    })
    const { value } = setup(() => ({
      following: useIsFollowing(() => 'bob'),
      liking: useIsLikingProject(() => ({ owner: 'bob', name: 'game' })),
      snapshotFollowing: useIsFollowing(() => 'bob', 'snapshot'),
      snapshotLiking: useIsLikingProject(() => ({ owner: 'bob', name: 'game' }), 'snapshot'),
      follow: useFollow(),
      unfollow: useUnfollow(),
      like: useLikeProject(),
      unlike: useUnlikeProject()
    }))
    await flushPromises()
    expect(value.following.data.value).toBe(false)
    expect(value.liking.data.value).toBe(false)
    await value.follow('bob')
    await value.like('bob', 'game')
    expect(value.following.data.value).toBe(true)
    expect(value.liking.data.value).toBe(true)
    expect(value.snapshotFollowing.data.value).toBe(false)
    expect(value.snapshotLiking.data.value).toBe(false)
    await flushPromises()
    await value.unfollow('bob')
    await value.unlike('bob', 'game')
    expect(value.following.data.value).toBe(false)
    expect(value.liking.data.value).toBe(false)
  })
})
