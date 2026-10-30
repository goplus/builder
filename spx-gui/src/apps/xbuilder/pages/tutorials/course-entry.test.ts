import { defineComponent, h, ref, type Plugin } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createI18n } from '@/utils/i18n'
import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useSeriesCourses, useUpdateCourseSeries } from '@/stores/course-series'
import { useUpdateCourse } from '@/stores/course'
import { CourseCreation } from '@/components/course/management/course-creation'
import { provideTutorial, Tutorial } from '@/components/tutorials/tutorial'
import PlaygroundComponent from '@/components/tutorials/playground/CoursePlayground.vue'
import CourseStart from './course-start.vue'
import CoursePlayground from './course-playground.vue'

const apis = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  series: vi.fn(),
  updateSeries: vi.fn(),
  load: vi.fn(),
  dispose: vi.fn()
}))
vi.mock('@/apis/course', () => ({
  listCourses: apis.list,
  getCourse: apis.get,
  addCourse: apis.add,
  updateCourse: apis.update,
  deleteCourse: vi.fn()
}))
vi.mock('@/apis/course-series', () => ({ getCourseSeries: apis.series, updateCourseSeries: apis.updateSeries }))
vi.mock('@/stores/user', () => ({
  useSignedInStateQuery: () => ({ data: ref({ isSignedIn: true }), error: ref(null), isLoading: ref(false) }),
  useSignIn: () => vi.fn()
}))
vi.mock('@/apps/xbuilder/router', () => ({
  getCourseStartRoute: (series: string, course: string) => `/course/${series}/${course}/start`,
  getCoursePlaygroundRoute: (series: string, course: string) => `/course/${series}/${course}/playground`,
  getCourseSeriesPageRoute: (series: string) => `/course-series/${series}`
}))
vi.mock('@/utils/exception', async (original) => ({
  ...(await original<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/models/tutorial/project', () => ({ TutorialProject: { load: apis.load } }))
vi.mock('@/components/editor/navbar/EditorNavbar.vue', () => ({ default: { template: '<header />' } }))
vi.mock('@/components/tutorials/playground/CoursePlayground.vue', () => ({
  default: defineComponent({
    name: 'CoursePlaygroundStub',
    props: { projectQueryRet: { type: Object, required: true } },
    setup: (props) => () =>
      h(
        'div',
        { class: 'playground' },
        props.projectQueryRet.error.value != null
          ? String(props.projectQueryRet.error.value)
          : props.projectQueryRet.data.value?.title ?? 'loading'
      )
  })
}))
vi.mock('@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue', () => ({ default: {} }))
vi.mock('@/components/ui', () => ({
  useModal: () => vi.fn(),
  UIDetailedLoading: { template: '<div>loading</div>' },
  UIError: { template: '<div><slot /></div>' }
}))

enableAutoUnmount(afterEach)
let client: QueryClient
let series: CourseSeries
let courses: PlaygroundCourse[]
const pending: Array<() => void> = []

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  series = { id: 'series', courseIDs: ['first'] } as CourseSeries
  courses = ['first', 'new'].map((id) => ({ id, title: id, kind: 'playground', content: {} }) as PlaygroundCourse)
  apis.series.mockImplementation(async () => ({ ...series, courseIDs: [...series.courseIDs] }))
  apis.get.mockImplementation(async (id) => courses.find((course) => course.id === id))
  apis.add.mockResolvedValue(courses[1])
  apis.update.mockImplementation(async (id, params) => {
    courses = courses.map((course) => (course.id === id ? { ...course, ...params } : course))
    return courses.find((course) => course.id === id)
  })
  apis.updateSeries.mockImplementation(async (_id, params) => {
    series = { ...series, ...params }
    return series
  })
  apis.list.mockImplementation(async () => ({
    data: series.courseIDs.map((id) => courses.find((course) => course.id === id)),
    total: series.courseIDs.length
  }))
  apis.load.mockImplementation(async (course) => ({
    title: course.title,
    code: 'initial',
    config: { inEditorPath: 'sprites/Lita/code' },
    disposeOnSignal: (signal: AbortSignal) => signal.addEventListener('abort', apis.dispose)
  }))
})
afterEach(() => {
  pending.splice(0).forEach((finish) => finish())
  client.clear()
})

function globals() {
  const queryPlugin: [Plugin, { queryClient: QueryClient }] = [VueQueryPlugin, { queryClient: client }]
  return { plugins: [queryPlugin, createI18n({ lang: 'en' })] }
}

async function openEntry(destination: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/course/:courseSeriesIdInput/:courseIdInput/start', component: CourseStart, props: true },
      {
        path: '/course/:courseSeriesIdInput/:courseIdInput/playground/:inPlaygroundPath*',
        component: CoursePlayground,
        props: true
      }
    ]
  })
  const tutorial = new Tutorial({ currentCourse: null, enterCourse: vi.fn(), endCurrentCourse: vi.fn() }, router)
  const enter = vi.spyOn(tutorial, 'enterCourse')
  await router.push(destination)
  const wrapper = mount(
    defineComponent({
      setup() {
        provideTutorial(tutorial)
        return () => h(RouterView)
      }
    }),
    {
      global: { plugins: [...globals().plugins, router] }
    }
  )
  await flushPromises()
  return { router, tutorial, enter, wrapper }
}

describe('Course entry with shared cached queries', () => {
  it('waits for invalidated series membership on Start before entering a newly added course', async () => {
    client.setQueryData(['course-series', 'series'], { ...series, courseIDs: ['first'] })
    await client.invalidateQueries({ queryKey: ['course-series', 'series'] })
    series.courseIDs = ['first', 'new']
    let finish!: () => void
    apis.series.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(series)
          pending.push(finish)
        })
    )
    const { wrapper, enter } = await openEntry('/course/series/new/start')
    expect(enter).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('loading')
    finish()
    await vi.waitFor(() => expect(wrapper.text()).toBe('new'))
    expect(enter).toHaveBeenCalledWith(courses[1], series)
  })

  it('creates and saves a course, then waits for a valid list after leaving management during refresh', async () => {
    let creation!: CourseCreation
    let save!: ReturnType<typeof useUpdateCourse>
    const management = mount(
      defineComponent({
        setup() {
          useSeriesCourses(() => 'series')
          creation = new CourseCreation('series', useUpdateCourseSeries())
          save = useUpdateCourse()
          return () => null
        }
      }),
      { global: globals() }
    )
    await flushPromises()
    // The management refresh is abandoned on navigation, just as in the reported flow.
    apis.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          pending.push(() => resolve({ data: [courses[0]], total: 1 }))
        })
    )
    await creation.run(async () => courses[1])
    await vi.waitFor(() => expect(apis.list).toHaveBeenCalledTimes(2))
    management.unmount()
    await save('new', { title: 'Saved lesson' })
    let finish!: () => void
    apis.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ data: [...courses], total: 2 })
        })
    )
    const { wrapper, enter } = await openEntry('/course/series/new/start')
    expect(enter).toHaveBeenCalledOnce()
    expect(apis.load).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('loading')
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    finish()
    await flushPromises()
    expect(wrapper.text()).toBe('Saved lesson')
    expect(apis.load).toHaveBeenCalledWith(courses[1])
  })

  it('preserves edits during background updates and reads the updated list when switching courses in the same series', async () => {
    const { wrapper, router, tutorial, enter } = await openEntry('/course/series/first/playground')
    const query = wrapper.findComponent(PlaygroundComponent).props('projectQueryRet')
    await vi.waitFor(() => expect(query.data.value).not.toBeNull())
    const project = query.data.value as NonNullable<typeof query.data.value> & { code: string }
    project.code = 'learner edit'
    series.courseIDs = ['first', 'new']
    courses = courses.map((course) => ({ ...course, title: `${course.id} revised` }))
    const finishes: Array<() => void> = []
    apis.list.mockImplementation(
      () =>
        new Promise((resolve) => {
          const finish = () => resolve({ data: [...courses], total: 2 })
          finishes.push(finish)
          pending.push(finish)
        })
    )
    const refresh = client.invalidateQueries({ queryKey: ['course-series-courses-by-page', 'series'] })
    await vi.waitFor(() => expect(finishes).toHaveLength(1))
    expect(apis.load).toHaveBeenCalledOnce()
    expect(query.data.value).toBe(project)
    expect(project.code).toBe('learner edit')
    await router.push('/course/series/first/playground/sprites/Lita/costumes')
    await flushPromises()
    expect(apis.load).toHaveBeenCalledOnce()
    await tutorial.startCourse('series', 'new')
    await vi.waitFor(() => expect(finishes).toHaveLength(2))
    expect(enter).toHaveBeenCalledWith(courses[1], series)
    expect(apis.dispose).toHaveBeenCalledOnce()
    expect(apis.load).toHaveBeenCalledOnce()
    expect(wrapper.text()).toBe('loading')
    finishes.forEach((finish) => finish())
    await refresh
    await flushPromises()
    expect(apis.load).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toBe('new revised')
  })

  it('retries a failed initial list read without re-entering an already completed Start step', async () => {
    apis.list.mockRejectedValueOnce(new Error('list unavailable'))
    const { wrapper, enter } = await openEntry('/course/series/first/start')
    const query = wrapper.findComponent(PlaygroundComponent).props('projectQueryRet')
    await vi.waitFor(() => expect(query.error.value).not.toBeNull())
    expect(apis.load).not.toHaveBeenCalled()
    query.refetch()
    await flushPromises()
    expect(query.error.value).toBeNull()
    expect(wrapper.text()).toBe('first')
    expect(enter).toHaveBeenCalledOnce()
  })

  it('refetches the successful list when retrying a failed project load', async () => {
    apis.load.mockRejectedValueOnce(new Error('project unavailable'))
    const { wrapper, enter } = await openEntry('/course/series/first/start')
    const query = wrapper.findComponent(PlaygroundComponent).props('projectQueryRet')
    await vi.waitFor(() => expect(query.error.value).not.toBeNull())
    expect(apis.list).toHaveBeenCalledOnce()
    query.refetch()
    await flushPromises()
    expect(query.error.value).toBeNull()
    expect(apis.list).toHaveBeenCalledTimes(2)
    expect(apis.load).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toBe('first')
    expect(enter).toHaveBeenCalledOnce()
  })
})
