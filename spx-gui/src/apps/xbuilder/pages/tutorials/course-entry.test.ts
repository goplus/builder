import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { computed, createApp, defineComponent, h, ref, type Ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Cancelled } from '@/utils/exception'

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  confirm: vi.fn(),
  state: null as Ref<{ isSignedIn: boolean; user: null } | null> | null
}))

vi.mock('@/stores/user', () => ({
  useSignIn: () => mocks.signIn,
  useSignedInStateQuery: () => ({
    data: mocks.state,
    error: ref(null),
    isLoading: computed(() => mocks.state!.value == null),
    progress: ref({ percentage: 0, timeLeft: null, desc: null })
  })
}))
vi.mock('@/utils/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/i18n')>()),
  useI18n: () => ({ t: (message: { en: string }) => message.en })
}))
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useModal: () => mocks.confirm,
  useMessage: () => ({ error: vi.fn() })
}))
vi.mock('../community/search.vue', () => ({ searchKeywordQueryParamName: 'q' }))

import { initRouter } from '../../router'

enableAutoUnmount(afterEach)

async function openCourse(destination: string, previousRoute: string | null = null) {
  const entered = vi.fn()
  const coursePage = defineComponent({
    setup() {
      entered()
      return () => h('div', 'Course runtime')
    }
  })
  const app = createApp({})
  vi.spyOn(app, 'use').mockReturnValue(app)
  const appRouter = initRouter(app)
  const courseRoute = appRouter.options.routes.find(
    (route) => route.path === '/course/:courseSeriesIdInput/:courseIdInput'
  )
  if (courseRoute == null || !('component' in courseRoute)) throw new Error('Course entry route not found')
  const history = createMemoryHistory()
  vi.spyOn(history, 'state', 'get').mockReturnValue({ back: previousRoute })
  const router = createRouter({
    history,
    routes: [
      { path: '/course-series/:id', component: { template: '<div>Course list</div>' } },
      { path: '/elsewhere', component: { template: '<div>Elsewhere</div>' } },
      {
        path: courseRoute.path,
        props: true,
        component: courseRoute.component,
        children: courseRoute.children!.map((route) =>
          route.redirect != null ? route : { path: route.path, props: true, component: coursePage }
        )
      }
    ]
  })
  await router.push(destination)
  await router.isReady()
  const wrapper = mount(RouterView, {
    global: { stubs: { UIError: true, UILoading: true }, plugins: [router], mocks: { $t: (m: { en: string }) => m.en } }
  })
  await flushPromises()
  return { router, wrapper, entered }
}

describe('Course entry authentication', () => {
  beforeEach(() => {
    mocks.state = ref({ isSignedIn: false, user: null })
    mocks.signIn.mockReset()
    mocks.confirm.mockReset().mockResolvedValue(null)
  })

  it.each([
    '/course/series/guided/start',
    '/course/series/playground/start',
    '/course/series/playground/playground/sprites/Lita/code?mode=edit#code'
  ])('requires sign-in before entering %s and preserves the exact destination', async (destination) => {
    const { router, entered } = await openCourse(destination, '/course-series/series?p=3')
    expect(entered).not.toHaveBeenCalled()
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.signIn).toHaveBeenCalledWith(destination, '/course-series/series?p=3')
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=3')
  })

  it.each(['/course/series/course?mode=edit#code', '/course/series/course/?mode=edit#code'])(
    'routes bare Course URL %s through the authenticated Start flow',
    async (destination) => {
      const { entered } = await openCourse(destination)
      expect(mocks.signIn).toHaveBeenCalledWith('/course/series/course/start?mode=edit#code', '/course-series/series')
      expect(entered).not.toHaveBeenCalled()
    }
  )

  it('returns to the same list page when sign-in is cancelled', async () => {
    mocks.confirm.mockRejectedValue(new Cancelled('cancelled'))
    const { router, entered } = await openCourse('/course/series/course/start', '/course-series/series?p=2')
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=2')
    expect(entered).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('keeps the list context when starting sign-in fails', async () => {
    mocks.signIn.mockRejectedValue(new Error('PAR unavailable'))
    const { router, entered } = await openCourse('/course/series/course/start', '/course-series/series?p=2')
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=2')
    expect(entered).not.toHaveBeenCalled()
  })

  it('uses the selected series list for direct navigation', async () => {
    const { router } = await openCourse('/course/series/course/playground')
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series')
    expect(mocks.signIn).toHaveBeenCalledWith('/course/series/course/playground', '/course-series/series')
  })

  it.each(['/course/series/guided/start', '/course/series/playground/playground'])(
    'lets authenticated learners enter %s without prompting',
    async (destination) => {
      mocks.state!.value = { isSignedIn: true, user: null }
      const { entered } = await openCourse(destination)
      expect(entered).toHaveBeenCalledOnce()
      expect(mocks.confirm).not.toHaveBeenCalled()
      expect(mocks.signIn).not.toHaveBeenCalled()
    }
  )

  it('waits for authentication before mounting a course', async () => {
    mocks.state!.value = null
    const { entered } = await openCourse('/course/series/course/start')
    expect(entered).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
    mocks.state!.value = { isSignedIn: true, user: null }
    await flushPromises()
    expect(entered).toHaveBeenCalledOnce()
  })

  it('keeps the course running when authenticated user data refreshes', async () => {
    mocks.state!.value = { isSignedIn: true, user: null }
    const { entered, wrapper } = await openCourse('/course/series/course/playground')
    mocks.state!.value = { isSignedIn: true, user: null }
    await flushPromises()
    expect(entered).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Course runtime')
  })

  it('uses the latest Course selection when the destination changes during the prompt', async () => {
    let resolvePrevious: (() => void) | null = null
    mocks.confirm.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolvePrevious = resolve
        })
    )
    const { router, entered } = await openCourse('/course/series/first/start')
    await router.push('/course/series/second/start')
    await flushPromises()
    resolvePrevious!()
    await flushPromises()
    expect(mocks.signIn).toHaveBeenCalledOnce()
    expect(mocks.signIn).toHaveBeenCalledWith('/course/series/second/start', '/course-series/series')
    expect(entered).not.toHaveBeenCalled()
  })

  it('does not redirect or sign in after leaving while the prompt is open', async () => {
    let resolveConfirm: (() => void) | null = null
    mocks.confirm.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        })
    )
    const { router, entered } = await openCourse('/course/series/course/start')
    await router.push('/elsewhere')
    resolveConfirm!()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/elsewhere')
    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(entered).not.toHaveBeenCalled()
  })
})
