import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref, shallowRef, toValue, type PropType } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createI18n } from '@/utils/i18n'
import type { Progress } from '@/utils/progress'
import type { QueryRet } from '@/utils/query'
import type { TutorialProject } from '@/models/tutorial/project'
import PlaygroundComponent from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundPage from './course-playground.vue'

const mocks = vi.hoisted(() => ({
  seriesQueryRet: null as any,
  courses: {} as Record<string, object>,
  openCompletion: vi.fn(),
  startCourse: vi.fn(),
  loadProject: vi.fn(),
  signIn: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: ref({ params: {}, query: {} }), replace: vi.fn(), push: vi.fn() })
}))
vi.mock('@/apps/xbuilder/router', () => ({ getCourseSeriesPageRoute: vi.fn() }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/stores/course-series', () => ({
  useSeries: () => mocks.seriesQueryRet
}))
vi.mock('@/stores/course', () => ({
  useCourse: (id: () => string) => ({
    isLoading: ref(false),
    data: computed(() => mocks.courses[toValue(id)]),
    error: shallowRef(null),
    progress: shallowRef<Progress>({ percentage: 0, desc: null, timeLeft: null }),
    refetch: vi.fn()
  })
}))
vi.mock('@/stores/user', () => ({
  useSignedIn: () => ({ isSignedIn: true, signIn: mocks.signIn })
}))
vi.mock('@/models/tutorial/project', () => ({ TutorialProject: { load: mocks.loadProject } }))
vi.mock('@/components/tutorials/tutorial', () => ({
  useTutorial: () => ({
    notifyPlaygroundCourseStarted: vi.fn(),
    notifyPlaygroundCourseEnded: vi.fn(),
    notifyPlaygroundCourseCompleted: vi.fn(),
    startCourse: mocks.startCourse
  })
}))
vi.mock('@/components/tutorials/playground/CoursePlayground.vue', () => ({
  default: defineComponent({
    name: 'CoursePlaygroundStub',
    props: { projectQueryRet: { type: Object as PropType<QueryRet<TutorialProject>>, required: true } },
    setup: (props) => () =>
      h('div', { class: 'project-progress', 'data-percentage': props.projectQueryRet.progress.value.percentage })
  })
}))
vi.mock('@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue', () => ({ default: {} }))
vi.mock('@/components/ui', () => ({ useModal: () => mocks.openCompletion }))

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})
beforeEach(() => {
  mocks.seriesQueryRet = {
    isLoading: ref(true),
    data: shallowRef(null),
    error: shallowRef(null),
    progress: shallowRef<Progress>({ percentage: 0, desc: null, timeLeft: null }),
    refetch: vi.fn()
  }
  mocks.courses = {
    course: { id: 'course', kind: 'playground', title: 'First course' },
    next: { id: 'next', kind: 'playground', title: 'Next course' }
  }
  mocks.openCompletion.mockReset()
  mocks.startCourse.mockReset()
  mocks.loadProject.mockReset().mockResolvedValue({
    disposeOnSignal: vi.fn(),
    getSignal: () => new AbortController().signal,
    isDisposed: false
  })
})

describe('Course page startup', () => {
  it('uses the Playground snapshot for completion and next-course navigation', async () => {
    mocks.seriesQueryRet.data.value = { id: 'series', courseIDs: ['course', 'next'] }
    mocks.seriesQueryRet.isLoading.value = false
    let complete!: (action: string) => void
    mocks.openCompletion.mockImplementation(() => new Promise((resolve) => (complete = resolve)))
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    await flushPromises()
    const playground = wrapper.findComponent(PlaygroundComponent)
    const project = playground.props('projectQueryRet').data.value
    playground.vm.$emit('course-completed', { feedback: null })
    await flushPromises()
    expect(mocks.openCompletion.mock.calls[0][0].series).toBe(mocks.seriesQueryRet.data.value)
    expect(mocks.openCompletion.mock.calls[0][0].course).toBe(mocks.courses.course)
    expect(playground.props('projectQueryRet').data.value).toBe(project)
    expect(mocks.loadProject).toHaveBeenCalledOnce()
    complete('next')
    await flushPromises()
    expect(mocks.startCourse).toHaveBeenCalledWith('series', 'next')
  })

  it('rejects a course that is not a member of the series', async () => {
    mocks.seriesQueryRet.data.value = { id: 'series', courseIDs: ['next'] }
    mocks.seriesQueryRet.isLoading.value = false
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    await flushPromises()
    const query = wrapper.findComponent(PlaygroundComponent).props('projectQueryRet')
    expect(query.error.value?.message).toContain('course course not found in series series')
    expect(query.data.value).toBeNull()
  })

  it('retries a failed series query through the page retry', async () => {
    mocks.seriesQueryRet.isLoading.value = false
    mocks.seriesQueryRet.error.value = new Error('Failed to load series')
    mocks.seriesQueryRet.refetch.mockImplementation(() => {
      mocks.seriesQueryRet.error.value = null
      mocks.seriesQueryRet.data.value = { id: 'series', courseIDs: ['course'] }
    })
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    await flushPromises()
    const query = wrapper.findComponent(PlaygroundComponent).props('projectQueryRet')
    expect(query.error.value?.message).toContain('Failed to load series')
    query.refetch()
    await flushPromises()
    expect(mocks.seriesQueryRet.refetch).toHaveBeenCalledOnce()
    expect(query.error.value).toBeNull()
    expect(query.data.value).not.toBeNull()
  })

  it('loads the new course when the course route changes', async () => {
    mocks.seriesQueryRet.data.value = { id: 'series', courseIDs: ['course', 'next'] }
    mocks.seriesQueryRet.isLoading.value = false
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    await flushPromises()
    expect(mocks.loadProject).toHaveBeenLastCalledWith({ id: 'course', kind: 'playground', title: 'First course' })
    expect(document.title).toBe('First course - Course - XBuilder')
    await wrapper.setProps({ courseIdInput: 'next' })
    await flushPromises()
    expect(document.title).toBe('Next course - Course - XBuilder')
    expect(mocks.loadProject).toHaveBeenLastCalledWith({ id: 'next', kind: 'playground', title: 'Next course' })
  })

  it('reports startup progress while loading series metadata and keeps the Playground mounted', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    const playground = wrapper.findComponent(PlaygroundComponent).element
    await flushPromises()
    vi.advanceTimersByTime(500)
    await nextTick()
    const firstProgress = Number(wrapper.find('.project-progress').attributes('data-percentage'))
    expect(firstProgress).toBeGreaterThan(0)
    mocks.seriesQueryRet.data.value = { id: 'series', courseIDs: ['course'] }
    mocks.seriesQueryRet.isLoading.value = false
    await flushPromises()
    expect(wrapper.find('.project-progress').attributes('data-percentage')).toBe('1')
    expect(wrapper.findComponent(PlaygroundComponent).element).toBe(playground)
    expect(wrapper.findComponent(PlaygroundComponent).props('projectQueryRet').data.value).not.toBeNull()
  })
})
