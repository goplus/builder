import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowRef, type PropType } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createI18n } from '@/utils/i18n'
import type { Progress } from '@/utils/progress'
import type { QueryRet } from '@/utils/query'
import type { TutorialProject } from '@/models/tutorial/project'
import CoursePlaygroundPage from './course-playground.vue'

const mocks = vi.hoisted(() => ({
  seriesQueryRet: null as any,
  getSeries: vi.fn(),
  loadProject: vi.fn(),
  signIn: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: ref({ params: {}, query: {} }), replace: vi.fn(), push: vi.fn() })
}))
vi.mock('@/apis/course-series', () => ({ getCourseSeries: mocks.getSeries }))
vi.mock('@/apps/xbuilder/router', () => ({ getCourseSeriesPageRoute: vi.fn() }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/stores/course-series', () => ({ useSeriesCourses: () => mocks.seriesQueryRet }))
vi.mock('@/stores/user', () => ({
  useSignIn: () => mocks.signIn,
  useSignedInStateQuery: () => ({
    isLoading: ref(false),
    data: ref({ isSignedIn: true }),
    error: ref(null)
  })
}))
vi.mock('@/models/tutorial/project', () => ({ TutorialProject: { load: mocks.loadProject } }))
vi.mock('@/components/tutorials/tutorial', () => ({
  useTutorial: () => ({ notifyPlaygroundCourseStarted: vi.fn(), notifyPlaygroundCourseEnded: vi.fn() })
}))
vi.mock('@/components/tutorials/playground/CoursePlayground.vue', () => ({
  default: defineComponent({
    name: 'CoursePlayground',
    props: { projectQueryRet: { type: Object as PropType<QueryRet<TutorialProject>>, required: true } },
    setup: (props) => () =>
      h('div', { class: 'project-progress', 'data-percentage': props.projectQueryRet.progress.value.percentage })
  })
}))
vi.mock('@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue', () => ({ default: {} }))
vi.mock('@/components/ui', () => ({ useModal: () => vi.fn() }))

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
  mocks.getSeries.mockReset()
  mocks.loadProject.mockReset().mockResolvedValue({ disposeOnSignal: vi.fn() })
})

describe('Course page startup progress', () => {
  it('loads the new course when the course route changes', async () => {
    mocks.seriesQueryRet.data.value = [
      { id: 'course', kind: 'playground', title: 'First course' },
      { id: 'next', kind: 'playground', title: 'Next course' }
    ]
    mocks.seriesQueryRet.isLoading.value = false
    mocks.getSeries.mockResolvedValue({ id: 'series', courseIDs: ['course', 'next'] })
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
    expect(mocks.getSeries).toHaveBeenCalledTimes(2)
    expect(mocks.loadProject).toHaveBeenLastCalledWith({ id: 'next', kind: 'playground', title: 'Next course' })
  })

  it('does not restart data loading when the course-list query finishes, and keeps the Playground mounted', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const finishSeries: Array<(series: object) => void> = []
    mocks.getSeries.mockImplementation(() => new Promise((resolve) => finishSeries.push(resolve)))
    wrapper = mount(CoursePlaygroundPage, {
      props: { courseSeriesIdInput: 'series', courseIdInput: 'course', inPlaygroundPath: ['code'] },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
    const playground = wrapper.findComponent({ name: 'CoursePlayground' }).element
    await flushPromises()
    vi.advanceTimersByTime(500)
    await nextTick()
    const firstProgress = Number(wrapper.find('.project-progress').attributes('data-percentage'))
    expect(firstProgress).toBeGreaterThan(0)
    mocks.seriesQueryRet.data.value = [{ id: 'course', kind: 'playground', title: 'First course' }]
    mocks.seriesQueryRet.isLoading.value = false
    await flushPromises()
    expect(mocks.getSeries).toHaveBeenCalledOnce()
    expect(Number(wrapper.find('.project-progress').attributes('data-percentage'))).toBeGreaterThanOrEqual(
      firstProgress
    )

    finishSeries[0]({ id: 'series', courseIDs: ['course'] })
    await flushPromises()
    expect(wrapper.find('.project-progress').attributes('data-percentage')).toBe('1')
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).element).toBe(playground)
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).props('projectQueryRet').data.value).not.toBeNull()
  })
})
