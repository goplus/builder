import { resolveObjectURL } from 'node:buffer'
import { defineComponent, h, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { createAppState } from '@/utils/app-state'
import { createI18n } from '@/utils/i18n'
import { createRadar } from '@/utils/radar'
import { createSpotlight } from '@/utils/spotlight'
import { initDayjs } from '@/setup/dayjs'
import { client } from '@/apis/common'
import { AssetType, type AssetData } from '@/apis/asset'
import { ProjectType, Visibility, type ProjectData } from '@/apis/project'
import * as projectApis from '@/apis/project'
import * as releaseApis from '@/apis/project-release'
import * as userApis from '@/apis/user'
import type { UserCapabilities } from '@/apis/user'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import { cloudHelpers } from '@/models/common/cloud'
import { localHelpers } from '@/models/common/local'
import { initUserState } from '@/stores/user'
import { provideProjectConfig } from '@/components/project/config'
import { provideCommunityConfig } from '@/components/community/config'
import { loadMonaco } from '@/components/xgo-code-editor/monaco'
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
import Admin from './admin/index.vue'
import AdminApps from './admin/apps.vue'
import AdminApp from './admin/app.vue'
import AdminGrant from './admin/grant.vue'
import AdminUsers from './admin/users.vue'
import AdminAuditLogs from './admin/audit-logs.vue'
import UserFollowers from './community/user/followers.vue'
import UserFollowing from './community/user/following.vue'

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
vi.mock('@/apis/admin/account', { spy: true })
vi.mock('@/apis/admin/audit', { spy: true })

enableAutoUnmount(afterEach)
initDayjs()
initUserState('test-client')
client.setBaseUrl('http://localhost/api')
cloudHelpers.setConfig({ baseUrl: 'https://assets.test', bucket: 'test' })
const fetchDataUrl = globalThis.fetch

export function makeProject(name: string): ProjectData {
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

export function makeAsset(name: string, type: AssetType, files: AssetData['files']): AssetData {
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

export async function signIn(capabilities: Partial<UserCapabilities> = {}) {
  const user = await userApis.getUser('alice')
  vi.mocked(userApis.getSignedInUser).mockResolvedValue({
    ...user,
    capabilities: {
      canManageAccount: false,
      canManageAuthorization: false,
      canManageAssets: false,
      canManageCourses: false,
      canUsePremiumLLM: false,
      ...capabilities
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

export async function mountPages(path: string) {
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
    { path: '/editor/:ownerNameInput/:projectNameInput/:inEditorPath*', component: Editor, props: true },
    { path: '/editor/:projectNameInput', component: OwnProject, props: true },
    { path: '/tutorials', component: Tutorials },
    {
      path: '/admin',
      component: Admin,
      children: [
        { path: 'users', component: AdminUsers },
        { path: 'apps', component: AdminApps },
        { path: 'apps/:appID', component: AdminApp, props: true },
        { path: 'users/:userID/app-grants/:grantID', component: AdminGrant, props: true },
        { path: 'audit-logs', component: AdminAuditLogs }
      ]
    },
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

export function setupPageTests() {
  beforeAll(async () => {
    await loadMonaco('en')
  }, 30_000)
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
    vi.mocked(projectApis.getProject).mockImplementation(async (owner, name) => ({ ...makeProject(name), owner }))
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
}
