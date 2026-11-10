import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { computed, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourseSeries } from '@/apis/course-series'
import type { Course } from '@/apis/course'
import { CourseState } from './tutorial'
import TutorialControlPanel from './TutorialControlPanel.vue'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'

const mocks = vi.hoisted(() => ({
  tutorial: {} as any,
  courses: {} as any,
  series: {} as any,
  seriesSource: null as (() => string | null) | null,
  confirm: vi.fn(),
  setVisible: vi.fn(),
  scrollIntoView: vi.fn(),
  push: vi.fn()
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: ref({ fullPath: '/editor/test' }), push: mocks.push })
}))
vi.mock('@/apps/xbuilder/router', () => ({
  getCourseSeriesPageRoute: (id: string, courseID: string) => `/course-series/${id}#course-${courseID}`
}))
vi.mock('@/stores/course-series', () => ({
  useSeriesWithCourses: (source: () => string | null) => {
    mocks.seriesSource = source
    return {
      data: computed(() => ({ series: mocks.series.data.value, courses: mocks.courses.data.value ?? [] })),
      isLoading: computed(() => mocks.series.isLoading.value || mocks.courses.isLoading.value),
      error: computed(() => mocks.series.error.value ?? mocks.courses.error.value),
      refetch: vi.fn()
    }
  }
}))
vi.mock('./tutorial', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./tutorial')>()),
  useTutorial: () => mocks.tutorial
}))
vi.mock('@/components/editor/EditorContextProvider.vue', () => ({ useEditorCtxRef: () => ref(null) }))
vi.mock('@/components/ui/UIDropdown.vue', () => ({ useDropdown: () => ({ setVisible: mocks.setVisible }) }))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (message: { en: string }) => message.en }) }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/components/ui', () => ({
  UIButton: { template: '<button><slot /></button>' },
  UILoading: { template: '<div>Loading</div>' },
  UIError: { template: '<div><slot /></div>' },
  UIImg: { template: '<img />' },
  useConfirmDialogWithResult: () => mocks.confirm
}))

enableAutoUnmount(afterEach)

function makeCourse(id: string): Course {
  return {
    id,
    title: `Course ${id}`,
    owner: 'alice',
    kind: 'guided',
    thumbnail: '',
    createdAt: '',
    updatedAt: '',
    content: { entrypoint: `/editor/alice/${id}`, prompt: '' }
  }
}

function mountPanel() {
  return mount(TutorialControlPanel, {
    global: {
      mocks: { $t: (message: { en: string }) => message.en },
      directives: { radar: {} }
    }
  })
}

describe('tutorial course dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(mocks.scrollIntoView)
    const courses = ['a', 'b', 'c'].map(makeCourse)
    mocks.courses = { data: ref(courses), isLoading: ref(false), error: ref(null) }
    mocks.series = {
      data: ref({
        id: 'series',
        courseIDs: ['a', 'b', 'c'],
        units: [
          { id: 'u1', title: 'Basics', courseIDs: ['a', 'b'] },
          { id: 'u2', title: 'Advanced', courseIDs: ['c'] }
        ]
      } as CourseSeries),
      isLoading: ref(false),
      error: ref(null)
    }
    mocks.tutorial = reactive({
      currentCourse: { id: 'b', seriesID: 'series', kind: 'guided', state: CourseState.InProgress },
      startCourse: vi.fn(),
      endCurrentCourse: vi.fn()
    })
    mocks.confirm.mockResolvedValue(true)
  })

  it('shows all units and courses in order, retaining active state and restart', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual(['Unit 1: Basics', 'Unit 2: Advanced'])
    expect(wrapper.findAll('ul').map((list) => list.findAll('li').length)).toEqual([2, 1])
    expect(
      wrapper.findAllComponents(TutorialStatusCourseRow).map((row) => [row.props('course').id, row.props('sequence')])
    ).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3]
    ])
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Course b')
    expect(wrapper.get('[aria-current="step"]').text()).toContain('in progress')
    expect(mocks.scrollIntoView).toHaveBeenCalled()
    await wrapper.get('[aria-current="step"] button').trigger('click')
    await flushPromises()
    expect(mocks.tutorial.startCourse).toHaveBeenCalledWith('series', 'b')
  })

  it('follows the current series and accepts the course being cleared before unmount', async () => {
    mountPanel()
    await flushPromises()
    const source = mocks.seriesSource!
    expect(source()).toBe('series')
    mocks.tutorial.currentCourse = {
      ...mocks.tutorial.currentCourse,
      seriesID: 'other-series'
    }
    expect(source()).toBe('other-series')
    mocks.tutorial.currentCourse = null
    expect(source()).toBeNull()
    await flushPromises()
  })

  it('switches across units and highlights the newly active course on reopening', async () => {
    let wrapper = mountPanel()
    await wrapper.findAll('li')[2].trigger('click')
    await flushPromises()
    expect(mocks.tutorial.startCourse).toHaveBeenCalledWith('series', 'c')
    expect(mocks.setVisible).toHaveBeenCalledWith(false)
    mocks.tutorial.currentCourse = { ...mocks.tutorial.currentCourse, id: 'c', state: CourseState.Completed }
    wrapper.unmount()
    wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Course c')
    expect(wrapper.get('[aria-current="step"]').text()).toContain('completed')
    expect(wrapper.findAll('li')).toHaveLength(3)
  })

  it('switches within the current unit after confirmation', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('li')[0].trigger('click')
    await flushPromises()
    expect(mocks.tutorial.startCourse).toHaveBeenCalledWith('series', 'a')
  })

  it('follows the latest units and series order without changing the active session', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const session = mocks.tutorial.currentCourse
    mocks.series.data.value = {
      ...mocks.series.data.value,
      courseIDs: ['c', 'a', 'b'],
      units: [
        { id: 'u2', title: 'Advanced revised', courseIDs: ['c', 'a'] },
        { id: 'u1', title: 'Basics revised', courseIDs: ['b'] }
      ]
    }
    mocks.courses.data.value = ['c', 'a', 'b'].map(makeCourse)
    await flushPromises()
    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual([
      'Unit 1: Advanced revised',
      'Unit 2: Basics revised'
    ])
    expect(
      wrapper.findAllComponents(TutorialStatusCourseRow).map((row) => [row.props('course').id, row.props('sequence')])
    ).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3]
    ])
    expect(mocks.tutorial.currentCourse).toBe(session)
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Course b')
    expect(mocks.tutorial.startCourse).not.toHaveBeenCalled()
  })

  it.each(['Exit course', 'Back to series courses'])(
    '%s does not need series metadata to end the course',
    async (action) => {
      mocks.series.data.value = null
      mocks.series.isLoading.value = true
      const wrapper = mountPanel()
      const button = wrapper.findAll('button').find((button) => button.text() === action)!
      await button.trigger('click')
      await flushPromises()
      expect(mocks.tutorial.endCurrentCourse).toHaveBeenCalledExactlyOnceWith()
      if (action === 'Back to series courses') {
        expect(mocks.push).toHaveBeenCalledWith('/course-series/series#course-b')
      }
    }
  )

  it('keeps a series without units as one course list', () => {
    mocks.series.data.value = { ...mocks.series.data.value, units: [] }
    const wrapper = mountPanel()
    expect(wrapper.findAll('ul')).toHaveLength(1)
    expect(wrapper.findAllComponents(TutorialStatusCourseRow).map((row) => row.props('course').id)).toEqual([
      'a',
      'b',
      'c'
    ])
  })
})
