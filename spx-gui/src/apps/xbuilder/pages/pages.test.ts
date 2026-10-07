import { defineComponent, h, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from '@/apis/common'
import { ExploreOrder, ProjectType, Visibility, type ProjectData } from '@/apis/project'
import * as projectApis from '@/apis/project'
import * as releaseApis from '@/apis/project-release'
import * as userApis from '@/apis/user'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import { provideCommunityConfig } from '@/components/community/config'
import { initDayjs } from '@/setup/dayjs'
import { initUserState } from '@/stores/user'
import { createAppState } from '@/utils/app-state'
import { createI18n } from '@/utils/i18n'
import { createRadar } from '@/utils/radar'
import { createSpotlight } from '@/utils/spotlight'
import App from '../App.vue'
import Project from './community/project.vue'
import Community from './community/index.vue'
import Home from './community/home.vue'
import Explore from './community/explore.vue'
import Search from './community/search.vue'
import Tutorials from './tutorials/index.vue'
import CourseSeries from './tutorials/course-series.vue'
import User from './community/user/index.vue'
import UserOverview from './community/user/overview.vue'
import UserProjects from './community/user/projects.vue'
import UserLikes from './community/user/likes.vue'
import UserFollowers from './community/user/followers.vue'
import UserFollowing from './community/user/following.vue'

vi.mock('@/setup', () => import('@/setup/i18n'))
vi.mock('@/apis/project', { spy: true })
vi.mock('@/apis/user', { spy: true })
vi.mock('@/apis/project-release', { spy: true })
vi.mock('@/apis/course-series', { spy: true })
vi.mock('@/apis/course', { spy: true })

enableAutoUnmount(afterEach)
initDayjs()
initUserState('test-client')
client.setBaseUrl('http://localhost/api')

function makeProject(name: string): ProjectData {
  return {
    id: name,
    owner: 'alice',
    name,
    displayName: name,
    type: ProjectType.Game,
    visibility: Visibility.Public,
    description: 'A game about exploring',
    instructions: 'Use the arrow keys',
    thumbnail: '',
    files: {},
    revision: 1,
    releaseCount: 0,
    latestRelease: null,
    remixedFrom: null,
    extraSettings: {},
    viewCount: 20,
    likeCount: 3,
    remixCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
}

async function mountPages(path: string) {
  const routes: RouteRecordRaw[] = [
    {
      path: '/',
      component: Community,
      children: [
        { path: '', component: Home },
        { path: 'explore', component: Explore },
        { path: 'project/:ownerInput/:nameInput', component: Project, props: true },
        { path: 'search', component: Search, meta: { isSearch: true } },
        {
          path: 'user/:nameInput',
          component: User,
          props: true,
          children: [
            { path: '', component: UserOverview, props: true },
            { path: 'projects', component: UserProjects, props: true },
            { path: 'likes', component: UserLikes, props: true },
            { path: 'followers', component: UserFollowers, props: true },
            { path: 'following', component: UserFollowing, props: true }
          ]
        }
      ]
    },
    { path: '/tutorials', component: Tutorials },
    { path: '/course-series/:courseSeriesIdInput', component: CourseSeries, props: true },
    { path: '/:pathMatch(.*)*', component: { template: '<div>Destination</div>' } }
  ]
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(
    defineComponent({
      setup() {
        onUnmounted(() => queryClient.clear())
        return () => h(App)
      }
    }),
    {
      attachTo: document.body,
      global: {
        plugins: [
          router,
          createI18n({ lang: 'en' }),
          createAppState(),
          createRadar(),
          createSpotlight(),
          [VueQueryPlugin, { queryClient }],
          {
            install(app) {
              provideCommunityConfig(app, { showLicense: true, showTutorialsEntry: true })
            }
          }
        ]
      }
    }
  )
  return { wrapper, router }
}

describe('page happy paths', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    vi.clearAllMocks()
    vi.spyOn(HTMLIFrameElement.prototype, 'src', 'set').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { headers: { ETag: '"test-version"' } }))
    vi.mocked(userApis.getUser).mockResolvedValue({
      id: 'alice',
      username: 'alice',
      displayName: 'Alice',
      avatar: '',
      description: '',
      plan: 'free',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
    vi.mocked(projectApis.recordProjectView).mockResolvedValue()
    vi.mocked(projectApis.isLiking).mockResolvedValue(false)
    vi.mocked(projectApis.listSignedInUserProjects).mockResolvedValue({ data: [makeProject('My spaceship')], total: 1 })
    vi.mocked(projectApis.exploreProjects).mockImplementation(async ({ order }) => [makeProject(order)])
    vi.mocked(projectApis.getProject).mockImplementation(async (_owner, name) => makeProject(name))
    vi.mocked(releaseApis.listProjectReleases).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(projectApis.listUserPublicProjects).mockResolvedValue({ data: [makeProject('First flight')], total: 1 })
    vi.mocked(projectApis.listUserLikedProjects).mockResolvedValue({ data: [makeProject('Moon landing')], total: 1 })
    vi.mocked(userApis.listUserFollowers).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(userApis.listUserFollowing).mockResolvedValue({ data: [], total: 0 })
    vi.mocked(projectApis.listProjects).mockResolvedValue({ data: [makeProject('Space game')], total: 1 })
    const series = {
      id: 'space',
      owner: 'alice',
      title: 'Space adventures',
      description: 'Build your first space game',
      thumbnail: '',
      courseIDs: ['first-flight', 'landing'],
      order: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    vi.mocked(courseSeriesApis.listCourseSeries).mockResolvedValue({ total: 1, data: [series] })
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue(series)
    vi.mocked(courseApis.listCourses).mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'first-flight',
          owner: 'alice',
          title: 'First flight',
          thumbnail: '',
          entrypoint: '/editor/alice/first-flight',
          prompt: 'Build a spaceship'
        }
      ]
    })
  })

  it('loads community projects and opens a project from its card', async () => {
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain(ExploreOrder.MostLikes))
    expect(wrapper.text()).toContain(ExploreOrder.MostRemixes)
    const card = wrapper.get(`a[href="/project/alice/${ExploreOrder.MostLikes}"]`)
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/project/alice/${ExploreOrder.MostLikes}`)
  })

  it('changes the explore ordering and reloads the project cards', async () => {
    const { wrapper, router } = await mountPages('/explore')
    await vi.waitFor(() => expect(wrapper.text()).toContain(ExploreOrder.MostLikes))
    const order = wrapper.findAll('button').find((button) => button.text() === 'Most recent remixes')!
    await order.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.o).toBe(ExploreOrder.MostRemixes))
    await vi.waitFor(() =>
      expect(wrapper.find(`a[href="/project/alice/${ExploreOrder.MostRemixes}"]`).exists()).toBe(true)
    )
  })

  it('searches through the navbar and displays matching project cards', async () => {
    const { wrapper, router } = await mountPages('/')
    const input = wrapper.get('input[placeholder="Search project"]')
    await input.setValue('space')
    await input.trigger('keypress', { key: 'Enter' })
    await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('space'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Found 1 projects for "space"'))
    expect(wrapper.get('a[href="/project/alice/Space%20game"]').text()).toContain('Space game')
    expect(projectApis.listProjects).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'space' }))
  })

  it('loads tutorial series and links to the selected series', async () => {
    const { wrapper, router } = await mountPages('/tutorials')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Space adventures'))
    expect(wrapper.text()).toContain('2 Total')
    await wrapper.get('a[href="/course-series/space"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/course-series/space')
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(wrapper.text()).toContain('Build your first space game')
    expect(wrapper.get('a[href="/course/space/first-flight/start"]').text()).toContain('First flight')
  })

  it('shows a user profile and navigates between their projects and likes', async () => {
    const { wrapper, router } = await mountPages('/user/alice')
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Moon landing')
    await wrapper.get('a[aria-label="Projects link"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/user/alice/projects'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    await wrapper.get('a[aria-label="Likes link"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/user/alice/likes'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Moon landing'))
  })

  it('loads a public project with its description, instructions and release history', async () => {
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('First flight'))
    expect(wrapper.text()).toContain('A game about exploring')
    expect(wrapper.text()).toContain('Use the arrow keys')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No release history yet'))
    expect(wrapper.get('button[aria-label="Run button"]').text()).toContain('Run')
    await wrapper.get('button[aria-label="Share button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sharing link input"] input').exists()).toBe(true))
    const link = wrapper.get<HTMLInputElement>('[aria-label="Sharing link input"] input').element.value
    expect(link).toBe(`${location.origin}/project/alice/First%20flight`)
    await wrapper.get('button[aria-label="Copy button"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe(link))
  })

  it('shows the signed-in user their projects and links to the editor', async () => {
    const user = await userApis.getUser('alice')
    vi.mocked(userApis.getSignedInUser).mockResolvedValue({
      ...user,
      capabilities: {
        canManageAccount: false,
        canManageAuthorization: false,
        canManageAssets: false,
        canManageCourses: false,
        canUsePremiumLLM: false
      }
    })
    localStorage.setItem(
      'builder-user',
      JSON.stringify({
        username: 'alice',
        accessToken: 'test-token',
        accessTokenExpiresAt: Date.now() + 3_600_000,
        refreshToken: null
      })
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Your projects'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('My spaceship'))
    expect(wrapper.text()).toContain('Users you follow are creating')
    expect(wrapper.get('a[href="/user/alice/projects"]').text()).toContain('View all')
    await wrapper.get('a[href="/project/alice/My%20spaceship"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('button[aria-label="Edit button"]').exists()).toBe(true))
    await wrapper.get('button[aria-label="Edit button"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My%20spaceship'))
  })
})
