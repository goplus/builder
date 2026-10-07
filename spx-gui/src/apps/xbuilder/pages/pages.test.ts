import { resolveObjectURL } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { defineComponent, h, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppState } from '@/utils/app-state'
import { createI18n } from '@/utils/i18n'
import { createRadar } from '@/utils/radar'
import { createSpotlight } from '@/utils/spotlight'
import { initDayjs } from '@/setup/dayjs'
import { client } from '@/apis/common'
import { AssetType, type AssetData } from '@/apis/asset'
import * as assetApis from '@/apis/asset'
import { ExploreOrder, ProjectType, Visibility, type ProjectData } from '@/apis/project'
import * as projectApis from '@/apis/project'
import * as releaseApis from '@/apis/project-release'
import * as userApis from '@/apis/user'
import * as copilotApis from '@/apis/copilot'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import { cloudHelpers } from '@/models/common/cloud'
import { localHelpers } from '@/models/common/local'
import { initUserState } from '@/stores/user'
import { provideProjectConfig } from '@/components/project/config'
import { provideCommunityConfig } from '@/components/community/config'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import App from '../App.vue'
import Editor from './editor/index.vue'
import OwnProject from './editor/own-project.vue'
import Project from './community/project.vue'
import Community from './community/index.vue'
import Home from './community/home.vue'
import Explore from './community/explore.vue'
import Search from './community/search.vue'
import Tutorials from './tutorials/index.vue'
import CourseSeries from './tutorials/course-series.vue'
import CourseStart from './tutorials/course-start.vue'
import User from './community/user/index.vue'
import UserOverview from './community/user/overview.vue'
import UserProjects from './community/user/projects.vue'
import UserLikes from './community/user/likes.vue'

vi.mock('@lottiefiles/dotlottie-vue', () => ({
  DotLottieVue: { template: '<span />', methods: { getDotLottieInstance: () => null } }
}))
vi.mock('@/components/xgo-code-editor/ui/MonacoEditor.vue', () => ({
  default: { inheritAttrs: false, template: '<textarea aria-label="Editor content" />' }
}))
// Load the real UI config without the canvas-dependent app bootstrap.
vi.mock('@/setup', () => import('@/setup/i18n'))
vi.mock('@/apis/asset', { spy: true })
vi.mock('@/apis/project', { spy: true })
vi.mock('@/apis/user', { spy: true })
vi.mock('@/apis/project-release', { spy: true })
vi.mock('@/apis/course-series', { spy: true })
vi.mock('@/apis/course', { spy: true })
vi.mock('@/apis/copilot', { spy: true })

enableAutoUnmount(afterEach)
initDayjs()
initUserState('test-client')
client.setBaseUrl('http://localhost/api')
cloudHelpers.setConfig({ baseUrl: 'https://assets.test', bucket: 'test' })
const fetchDataUrl = globalThis.fetch

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

function makeAsset(name: string, type: AssetType, files: AssetData['files']): AssetData {
  return {
    id: name,
    owner: 'alice',
    displayName: name,
    type,
    description: '',
    extraSettings: {},
    filesHash: name,
    visibility: Visibility.Public,
    files
  }
}

async function signIn() {
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
            { path: 'likes', component: UserLikes, props: true }
          ]
        }
      ]
    },
    { path: '/editor/:ownerNameInput/:projectNameInput/:inEditorPath*', component: Editor, props: true },
    { path: '/editor/:projectNameInput', component: OwnProject, props: true },
    { path: '/tutorials', component: Tutorials },
    { path: '/course-series/:courseSeriesIdInput', component: CourseSeries, props: true },
    { path: '/course/:courseSeriesIdInput/:courseIdInput/start', component: CourseStart, props: true },
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
        stubs: { 'v-stage': true, 'v-layer': true, 'v-rect': true, 'v-group': true },
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
              provideProjectConfig(app, { defaultFontPreferences: [] })
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
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    vi.clearAllMocks()
    vi.spyOn(localHelpers, 'load').mockResolvedValue(null)
    vi.spyOn(localHelpers, 'save').mockResolvedValue()
    vi.spyOn(localHelpers, 'clear').mockResolvedValue()
    class LanguageWorker extends EventTarget {
      postMessage(data: { type: string; message?: { id?: number; method: string; params?: { command?: string } } }) {
        if (data.type !== 'lsp' || data.message?.id == null) return
        const { id, method, params } = data.message
        const result =
          method === 'initialize'
            ? { capabilities: {} }
            : method === 'workspace/diagnostic'
              ? { items: [] }
              : params?.command === 'xgo.renameResources'
                ? { changes: {} }
                : []
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent('message', { data: { type: 'lsp', message: { jsonrpc: '2.0', id, result } } })
          )
        )
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', LanguageWorker)
    vi.stubGlobal('scheduler', { postTask: async (callback: () => unknown) => callback() })
    // Keep the external WASM runner document on about:blank.
    vi.spyOn(HTMLIFrameElement.prototype, 'src', 'set').mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return {
        canvas: this,
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn()
      } as unknown as CanvasRenderingContext2D
    })
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (typeof input === 'string' && input.startsWith('data:')) return fetchDataUrl(input, init)
      if (typeof input === 'string' && input.startsWith('blob:')) {
        const blob = resolveObjectURL(input)
        if (blob != null) return new Response(await blob.arrayBuffer())
      }
      if (input === '/' && init?.method === 'HEAD') return new Response(null, { headers: { ETag: '"test-version"' } })
      throw new Error(`Unexpected request: ${input}`)
    })
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
    await signIn()
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Your projects'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('My spaceship'))
    expect(wrapper.text()).toContain('Users you follow are creating')
    expect(wrapper.get('a[href="/user/alice/projects"]').text()).toContain('View all')
    await wrapper.get('a[href="/project/alice/My%20spaceship"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('button[aria-label="Edit button"]').exists()).toBe(true))
    await wrapper.get('button[aria-label="Edit button"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My%20spaceship/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await flushPromises()
  })

  it('opens the editor and creates, edits and manages a monitor', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Stage overview"]').trigger('click')
    await wrapper.get('[aria-label="Sounds tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No sounds'))
    await wrapper.get('[aria-label="Widgets tab"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No widgets'))
    await wrapper.get('[aria-label="Add monitor button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Label input"] input').exists()).toBe(true))
    await wrapper.get('[aria-label="Label input"] input').setValue('Score')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await vi.waitFor(() => expect(project.stage.widgets[0].label).toBe('Score'))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Visibility control"]').exists()).toBe(true))
    await wrapper
      .findAll('[aria-label="Visibility control"]')
      .find((control) => control.text() === 'Hide Widget')!
      .trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets[0].visible).toBe(false))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets).toHaveLength(2))
    expect(project.stage.widgets[1].label).toBe('Score')
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.widgets).toHaveLength(1))
    await wrapper.get('[aria-label="Widgets management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('ScoreDisplay')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.stage.widgets[0].name).toBe('ScoreDisplay'))
  })

  it('imports a backdrop and renames it with undo and redo', async () => {
    const config = { name: 'Grassland', path: 'grass.svg', x: 240, y: 180, imageWidth: 480, imageHeight: 360 }
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Grassland', AssetType.Backdrop, {
          'assets/__backdrop__.json': `data:application/json,${encodeURIComponent(JSON.stringify(config))}`,
          'assets/grass.svg': `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="green"/></svg>')}`
        })
      ]
    })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Backdrops quick entry"]').exists()).toBe(true), {
      timeout: 4000
    })
    await wrapper.get('[aria-label="Backdrops quick entry"]').trigger('click')
    await wrapper.get('[aria-label="Add backdrop"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(modal.text()).toContain('Grassland'))
    await modal
      .get('[aria-label="Asset list"]')
      .findAll('[title]')
      .find((item) => item.attributes('title') === 'Grassland')!
      .trigger('click')
    await modal.get('[aria-label="Confirm button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(false))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toContain('Grassland')
    await wrapper.get('[aria-label="Backdrops management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('Landing')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Landing']))
    const history = wrapper.getComponent(EditorNavbar).findAll('button')
    await history[0].trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Grassland']))
    await history[1].trigger('click')
    await vi.waitFor(() => expect(project.stage.backdrops.map((backdrop) => backdrop.name)).toEqual(['Landing']))
  })

  it('imports a sprite, selects its costume and groups costumes into an animation', async () => {
    const costumes = ['Idle', 'Flying'].map((name) => ({
      name,
      path: `${name}.svg`,
      x: 24,
      y: 18,
      imageWidth: 48,
      imageHeight: 36
    }))
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36"><rect width="48" height="36" fill="blue"/></svg>'
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Spaceship', AssetType.Sprite, {
          'assets/sprites/Spaceship/index.json': `data:application/json,${encodeURIComponent(JSON.stringify({ costumes }))}`,
          'assets/sprites/Spaceship/Idle.svg': `data:image/svg+xml,${encodeURIComponent(svg)}`,
          'assets/sprites/Spaceship/Flying.svg': `data:image/svg+xml,${encodeURIComponent(svg)}`
        })
      ]
    })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sprites panel"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Sprites panel"]').get('[aria-label="Add"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const library = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(library.text()).toContain('Spaceship'))
    await library.get('[title="Spaceship"]').trigger('click')
    await library.get('[aria-label="Confirm button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Costumes tab"]').exists()).toBe(true))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    expect(project.sprites[0].name).toBe('Spaceship')
    await wrapper.get('[aria-label="Costumes tab"]').trigger('click')
    await wrapper.get('[aria-label="Costumes management"]').get('[title="Flying"]').trigger('click')
    expect(project.sprites[0].defaultCostume?.name).toBe('Flying')
    await wrapper.get('[aria-label="Rename button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Rename modal"]')
    await rename.get('[aria-label="Name input"] input').setValue('Flight')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].defaultCostume?.name).toBe('Flight'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(false))

    await wrapper.get('[aria-label="Animations tab"]').trigger('click')
    await wrapper.get('[aria-label="Group costumes button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Group costumes modal"]').exists()).toBe(true))
    const grouping = wrapper.get('[aria-label="Group costumes modal"]')
    await grouping.get('[title="Idle"]').trigger('click')
    await grouping.get('[title="Flight"]').trigger('click')
    await grouping.get('[aria-label="Add animation button"]').trigger('click')
    await vi.waitFor(() => expect(project.sprites[0].animations).toHaveLength(1))
    expect(project.sprites[0].animations[0].costumes.map((costume) => costume.name)).toEqual(['Idle', 'Flight'])
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit duration"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Edit duration"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duration editor dropdown form"]').exists()).toBe(true))
    const duration = wrapper.get('[aria-label="Duration editor dropdown form"]')
    await duration.get('input').setValue('0.8')
    await duration.trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].animations[0].duration).toBe(0.8))
    await wrapper.get('[aria-label="Rename button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(true))
    const renameAnimation = wrapper.get('[aria-label="Rename modal"]')
    await renameAnimation.get('[aria-label="Name input"] input').setValue('Fly')
    await renameAnimation.get('form').trigger('submit')
    await vi.waitFor(() => expect(project.sprites[0].animations[0].name).toBe('Fly'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Rename modal"]').exists()).toBe(false))

    await wrapper.get('[aria-label="Edit bound state"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Bound state editor dropdown form"]').exists()).toBe(true))
    const binding = wrapper.get('[aria-label="Bound state editor dropdown form"]')
    await binding.get('[aria-label="State step"]').trigger('click')
    await binding.trigger('submit')
    await vi.waitFor(() =>
      expect(project.sprites[0].getAnimationBoundStates(project.sprites[0].animations[0].id)).toContain('step')
    )

    await wrapper.get('[aria-label="Map edit mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Map viewer"]').exists()).toBe(true))
    await wrapper.findAll('[title="Spaceship"]')[0].trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[aria-label="Basic configuration for selected sprite"]').exists()).toBe(true)
    )
    const settings = wrapper.get('[aria-label="Basic configuration for selected sprite"]')
    await settings.get('[aria-label="X position input"] input').setValue('100')
    await vi.waitFor(() => expect(project.sprites[0].x).toBe(100))
    await settings.get('[aria-label="Y position input"] input').setValue('50')
    await vi.waitFor(() => expect(project.sprites[0].y).toBe(50))
    await settings.get('[aria-label="Size input"] input').setValue('75')
    await vi.waitFor(() => expect(project.sprites[0].size).toBe(0.75))
    await settings.get('[aria-label="Heading input"] input').setValue('45')
    await vi.waitFor(() => expect(project.sprites[0].heading).toBe(45))
    await settings.get('[aria-label="Visibility control"]').findAll('[role="button"]')[1].trigger('click')
    await vi.waitFor(() => expect(project.sprites[0].visible).toBe(false))
    await settings.get('[aria-label="Collapse button"]').trigger('click')
    await wrapper.get('[aria-label="Expand button"]').trigger('click')
    expect(wrapper.find('[aria-label="Basic configuration for selected sprite"]').exists()).toBe(true)
  })

  it('configures map size and physics through map edit mode', async () => {
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Map edit mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Map viewer"]').exists()).toBe(true))
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await wrapper.get('[aria-label="width input"] input').setValue('960')
    await vi.waitFor(() => expect(project.stage.mapWidth).toBe(960))
    await wrapper.get('[aria-label="height input"] input').setValue('720')
    await vi.waitFor(() => expect(project.stage.mapHeight).toBe(720))
    await wrapper.get('[aria-label="physics input"]').trigger('click')
    await vi.waitFor(() => expect(project.stage.physics.enabled).toBe(true))
    const vertical = wrapper.findAll('label').find((item) => item.text() === 'Vertical')!
    await vertical.trigger('click')
    await vi.waitFor(() => expect(project.stage.layerSortMode).toBe('vertical'))
    await wrapper.get('[aria-label="Default mode"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true))
  })

  it('imports a sound, previews it and manages its copies', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(1)
    class TestAudioContext {
      state = 'running'
      destination = {}
      createMediaElementSource() {
        return { connect() {} }
      }
      createGain() {
        return { gain: { value: 1 }, connect() {} }
      }
      async decodeAudioData() {
        return { getChannelData: () => new Float32Array(12800).fill(0.25) }
      }
    }
    vi.stubGlobal('AudioContext', TestAudioContext)
    vi.mocked(assetApis.listAssets).mockResolvedValue({
      total: 1,
      data: [
        makeAsset('Beep', AssetType.Sound, {
          'assets/sounds/Beep/index.json': `data:application/json,${encodeURIComponent(JSON.stringify({ path: 'beep.wav', rate: 12800, sampleCount: 12800 }))}`,
          'assets/sounds/Beep/beep.wav': `data:audio/wav;base64,${readFileSync('src/components/project/default-project/assets/sounds/grass footsteps/sound.wav').toString('base64')}`
        })
      ]
    })
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sounds quick entry"]').exists()).toBe(true), {
      timeout: 4000
    })
    await wrapper.get('[aria-label="Sounds quick entry"]').trigger('click')
    await wrapper.get('[aria-label="Add sound button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Add from asset library"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Add from asset library"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Asset library modal"]').exists()).toBe(true))
    const library = wrapper.get('[aria-label="Asset library modal"]')
    await vi.waitFor(() => expect(library.text()).toContain('Beep'))
    await library.get('[title="Beep"]').trigger('click')
    await library.get('[aria-label="Confirm button"]').trigger('click')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    await vi.waitFor(() => expect(project.sounds.map((sound) => sound.name)).toEqual(['Beep']))
    await vi.waitFor(() => expect(wrapper.find('.volume-slider').exists()).toBe(true))
    await wrapper.get('.volume-slider input').setValue('0.5')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Save button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Cancel button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Save button"]').exists()).toBe(false))
    await wrapper.get('.play-control-play').trigger('click')
    await vi.waitFor(() => expect(play).toHaveBeenCalled())
    await wrapper.get('.play-control-stop').trigger('click')
    await wrapper.get('[aria-label="Sounds management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Duplicate"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Duplicate"]').trigger('click')
    await vi.waitFor(() => expect(project.sounds).toHaveLength(2))
    await wrapper.get('[aria-label="Sounds management"] [aria-label="Options button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remove"]').trigger('click')
    await vi.waitFor(() => expect(project.sounds.map((sound) => sound.name)).toEqual(['Beep']))
  })

  it('remixes a public project and opens the new project in the editor', async () => {
    await signIn()
    vi.mocked(projectApis.isProjectNameTaken).mockResolvedValue(false)
    vi.mocked(projectApis.addProject).mockResolvedValue(makeProject('My-remix'))
    vi.mocked(releaseApis.listProjectReleases).mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'release',
          projectFullName: 'bob/Space',
          name: '1.0.0',
          description: 'First release',
          files: {},
          thumbnail: '',
          remixCount: 0,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        }
      ]
    })
    vi.mocked(projectApis.getProject).mockImplementation(async (owner, name) => ({ ...makeProject(name), owner }))
    const { wrapper, router } = await mountPages('/project/bob/Space')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remix button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remix button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Create project modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Create project modal"]')
    await modal.get('[aria-label="Project name input"] input').setValue('My-remix')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(projectApis.addProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My-remix', remixSource: 'bob/Space' })
      )
    )
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My-remix/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
  })

  it('edits the signed-in user profile and displays the saved values', async () => {
    await signIn()
    const user = await userApis.getSignedInUser()
    vi.mocked(userApis.updateSignedInUser).mockImplementation(async (params) => {
      const updated = { ...user, ...params }
      vi.mocked(userApis.getUser).mockResolvedValue(updated)
      return updated
    })
    const { wrapper } = await mountPages('/user/alice')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Edit profile button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Edit profile modal"]')
    await modal.get('[aria-label="Display name input"] input').setValue('Alice the pilot')
    await modal.get('[aria-label="About me input"] textarea').setValue('I make space games')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile modal"]').exists()).toBe(false))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Alice the pilot'))
    expect(wrapper.text()).toContain('I make space games')
    expect(userApis.updateSignedInUser).toHaveBeenCalledWith({
      displayName: 'Alice the pilot',
      description: 'I make space games'
    })
  })
  it('starts a course in the editor and displays the copilot guidance', async () => {
    await signIn()
    vi.mocked(courseApis.getCourse).mockResolvedValue({
      id: 'first-flight',
      owner: 'alice',
      title: 'First flight',
      thumbnail: '',
      entrypoint: '/editor/alice/first-flight',
      prompt: 'Build a spaceship'
    })
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* () {
      yield { type: 'text_delta', data: { text: 'Welcome! Start by adding a spaceship.' } }
      yield { type: 'done', data: { finishReason: 'stop' } }
    })
    const { wrapper, router } = await mountPages('/course-series/space')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/first-flight/start"]').exists()).toBe(true))
    await wrapper.get('a[href="/course/space/first-flight/start"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/first-flight/sprites'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Welcome! Start by adding a spaceship.'), { timeout: 4000 })
    await vi.waitFor(() => expect(wrapper.findAll('button').some((button) => button.text() === 'Next step')).toBe(true))
    const next = wrapper.findAll('button').find((button) => button.text() === 'Next step')!
    await next.trigger('click')
    await vi.waitFor(() => expect(copilotApis.generateCopilotMessage).toHaveBeenCalledTimes(2))
    expect(vi.mocked(copilotApis.generateCopilotMessage).mock.calls[1][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({
            text: expect.stringContaining('I did what you asked. Tell me what to do next.')
          })
        })
      ])
    )
    await vi.waitFor(() => expect(wrapper.findAll('button').some((button) => button.text() === 'Next step')).toBe(true))
    expect(copilotApis.generateCopilotMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({ text: expect.stringContaining('Build a spaceship') })
        })
      ]),
      expect.anything()
    )
  })
})
