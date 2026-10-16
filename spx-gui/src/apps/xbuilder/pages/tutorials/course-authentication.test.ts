import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, ref, type Ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Cancelled } from '@/utils/exception'

const mocks = vi.hoisted(() => ({
  signedIn: false,
  courseLoading: null as Ref<boolean> | null,
  seriesLoading: null as Ref<boolean> | null,
  seriesCoursesLoading: null as Ref<boolean> | null,
  signIn: vi.fn(),
  confirm: vi.fn(),
  enter: vi.fn(),
  start: vi.fn(),
  load: vi.fn(),
  notifyStarted: vi.fn(),
  error: vi.fn(),
  course: { id: 'course', kind: 'guided' as 'guided' | 'playground' },
  series: { id: 'series', title: 'Series', thumbnail: '', description: '', courseIDs: ['course'] }
}))

vi.mock('@/stores/user', () => ({
  isSignedIn: () => mocks.signedIn,
  useSignedInStateQuery: () => ({
    data: ref({ isSignedIn: mocks.signedIn, user: null }),
    error: ref(null),
    isLoading: ref(false),
    progress: ref({ percentage: 0 })
  }),
  useSignIn: () => mocks.signIn
}))
vi.mock('@/stores/course', () => ({
  useCourse: () => {
    const isLoading = ref(false)
    mocks.courseLoading = isLoading
    return {
      data: ref(mocks.course),
      error: ref(null),
      isLoading,
      progress: ref({ percentage: 0 })
    }
  }
}))
vi.mock('@/stores/course-series', () => ({
  useSeries: () => {
    const isLoading = ref(false)
    mocks.seriesLoading = isLoading
    return {
      data: ref(mocks.series),
      error: ref(null),
      isLoading,
      progress: ref({ percentage: 0 })
    }
  },
  useSeriesCourses: () => {
    const isLoading = ref(false)
    mocks.seriesCoursesLoading = isLoading
    return {
      data: ref([mocks.course]),
      error: ref(null),
      isLoading,
      progress: ref({ percentage: 0 })
    }
  }
}))
vi.mock('@/apis/course-series', () => ({ getCourseSeries: async () => mocks.series }))
vi.mock('@/apis/course', () => ({ listCourses: async () => ({ data: [mocks.course], total: 30 }) }))
vi.mock('@/models/tutorial/project', () => ({ TutorialProject: { load: mocks.load } }))
vi.mock('@/components/tutorials/tutorial', () => ({
  useTutorial: () => ({
    enterCourse: mocks.enter,
    startCourse: mocks.start,
    getCourseStartRoute: (series: string, course: string) => `/course/${series}/${course}/start`,
    notifyPlaygroundCourseStarted: mocks.notifyStarted,
    notifyPlaygroundCourseEnded: vi.fn()
  })
}))
vi.mock('@/utils/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/i18n')>()),
  useI18n: () => ({ t: (message: { en: string }) => message.en })
}))
vi.mock('@/utils/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/utils')>()),
  usePageTitle: vi.fn(),
  useAsyncComputed: () => ref(null)
}))
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useModal: () => vi.fn(),
  useConfirmDialog: () => mocks.confirm,
  useResponsive: () => ref(false),
  useMessage: () => ({ error: mocks.error })
}))
vi.mock('@/components/tutorials/playground/CoursePlayground.vue', () => ({
  default: { name: 'CoursePlayground', props: ['projectQueryRet'], template: '<div>Playground</div>' }
}))
vi.mock('@/components/community/CommunityNavbar.vue', () => ({ default: { template: '<nav />' } }))
vi.mock('@/components/community/footer/CommunityFooter.vue', () => ({ default: { template: '<footer />' } }))
vi.mock('../community/search.vue', () => ({ searchKeywordQueryParamName: 'q' }))

import CourseStart from './course-start.vue'
import CoursePlayground from './course-playground.vue'
import CourseSeries from './course-series.vue'

enableAutoUnmount(afterEach)

async function openPage(destination: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/course-series/:courseSeriesIdInput', component: CourseSeries, props: true },
      { path: '/course/:courseSeriesIdInput/:courseIdInput/start', component: CourseStart, props: true },
      {
        path: '/course/:courseSeriesIdInput/:courseIdInput/playground/:inPlaygroundPath*',
        component: CoursePlayground,
        props: true
      }
    ]
  })
  await router.push(destination)
  await router.isReady()
  const page = shallowMount(router.currentRoute.value.matched[0].components!.default, {
    props: router.currentRoute.value.params,
    global: {
      plugins: [router],
      renderStubDefaultSlot: true,
      mocks: { $t: (message: { en: string }) => message.en },
      stubs: {
        ListResultWrapper: defineComponent({
          setup(_props, { slots }) {
            return () => slots.default?.({ data: { data: [mocks.course] } })
          }
        })
      }
    }
  })
  await flushPromises()
  return { router, page }
}

describe('Course authentication', () => {
  beforeEach(() => {
    mocks.signedIn = false
    mocks.course.kind = 'guided'
    mocks.signIn.mockReset().mockResolvedValue(null)
    mocks.confirm.mockReset().mockImplementation(async (options) => options.confirmHandler())
    mocks.enter.mockReset()
    mocks.start.mockReset()
    mocks.load.mockReset().mockResolvedValue({ config: {}, disposeOnSignal: vi.fn() })
    mocks.notifyStarted.mockReset()
    mocks.error.mockReset()
  })

  it('keeps the list page while requesting sign-in for the selected Course', async () => {
    const { router, page } = await openPage('/course-series/series?p=3')
    await page.get('a[href="/course/series/course/start"]').trigger('click')
    await flushPromises()
    expect(mocks.signIn).toHaveBeenCalledWith('/course/series/course/start')
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=3')
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('keeps the list and pagination when the prompt is cancelled', async () => {
    mocks.confirm.mockRejectedValue(new Cancelled('cancelled'))
    const { router, page } = await openPage('/course-series/series?p=3')
    await page.get('a[href="/course/series/course/start"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=3')
    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('keeps the list when starting sign-in fails', async () => {
    mocks.signIn.mockRejectedValue(new Error('PAR failed'))
    const { router, page } = await openPage('/course-series/series?p=3')
    await page.get('a[href="/course/series/course/start"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/course-series/series?p=3')
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('starts the selected Course without prompting signed-in learners', async () => {
    mocks.signedIn = true
    const { page } = await openPage('/course-series/series?p=3')
    await page.get('a[href="/course/series/course/start"]').trigger('click')
    await flushPromises()
    expect(mocks.start).toHaveBeenCalledWith('series', 'course')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it.each(['/course/series/course/start', '/course/series/course/playground/sprites/Lita/code?mode=edit#code'])(
    'protects direct entry %s before starting a runtime',
    async (destination) => {
      const { router } = await openPage(destination)
      expect(mocks.signIn).toHaveBeenCalledWith()
      expect(router.currentRoute.value.fullPath).toBe(destination)
      expect(mocks.enter).not.toHaveBeenCalled()
      expect(mocks.load).not.toHaveBeenCalled()
    }
  )

  it.each(['/course/series/course/start', '/course/series/course/playground'])(
    'shows the existing query error when sign-in cannot start at %s',
    async (destination) => {
      mocks.signIn.mockRejectedValue(new Error('PAR failed'))
      const { router, page } = await openPage(destination)
      expect(router.currentRoute.value.fullPath).toBe(destination)
      if (destination.endsWith('/playground')) {
        expect(page.findComponent({ name: 'CoursePlayground' }).props('projectQueryRet').error.value).not.toBeNull()
      } else {
        expect(page.findComponent({ name: 'UIError' }).exists()).toBe(true)
      }
      expect(mocks.enter).not.toHaveBeenCalled()
      expect(mocks.load).not.toHaveBeenCalled()
    }
  )

  it.each(['guided', 'playground'] as const)('enters a signed-in %s Course through Start', async (kind) => {
    mocks.course.kind = kind
    mocks.signedIn = true
    await openPage('/course/series/course/start')
    expect(mocks.enter).toHaveBeenCalledWith(mocks.course, mocks.series)
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it.each(['courseLoading', 'seriesLoading'] as const)(
    'refreshes Start when its %s dependency reloads',
    async (query) => {
      mocks.signedIn = true
      await openPage('/course/series/course/start')
      expect(mocks.enter).toHaveBeenCalledOnce()
      mocks[query]!.value = true
      await flushPromises()
      mocks[query]!.value = false
      await flushPromises()
      expect(mocks.enter).toHaveBeenCalledTimes(2)
    }
  )

  it('keeps the active Playground when the Course list reloads', async () => {
    mocks.course.kind = 'playground'
    mocks.signedIn = true
    await openPage('/course/series/course/playground')
    expect(mocks.load).toHaveBeenCalledOnce()
    mocks.seriesCoursesLoading!.value = true
    await flushPromises()
    mocks.seriesCoursesLoading!.value = false
    await flushPromises()
    expect(mocks.load).toHaveBeenCalledOnce()
    expect(mocks.notifyStarted).toHaveBeenCalledOnce()
  })

  it('loads a signed-in Playground on direct navigation', async () => {
    mocks.course.kind = 'playground'
    mocks.signedIn = true
    await openPage('/course/series/course/playground')
    expect(mocks.load).toHaveBeenCalledWith(mocks.course)
    expect(mocks.notifyStarted).toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
})
