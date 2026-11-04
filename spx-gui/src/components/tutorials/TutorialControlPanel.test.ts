import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Course } from '@/apis/course'
import { CourseState, type CurrentCourse } from './tutorial'
import TutorialControlPanel from './TutorialControlPanel.vue'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'

const mocks = vi.hoisted(() => ({
  tutorial: {} as any,
  courses: {} as any,
  confirm: vi.fn(),
  setVisible: vi.fn(),
  scrollIntoView: vi.fn()
}))
vi.mock('vue-router', () => ({ useRouter: () => ({}) }))
vi.mock('@/apps/xbuilder/router', () => ({ getCourseSeriesPageRoute: vi.fn() }))
vi.mock('@/stores/course-series', () => ({ useSeriesCourses: () => mocks.courses }))
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
    mocks.courses = { data: ref(courses), isLoading: ref(false) }
    mocks.tutorial = reactive({
      currentCourse: {
        ...courses[1],
        state: CourseState.InProgress,
        series: {
          id: 'series',
          courseIDs: ['a', 'b', 'c'],
          units: [
            { id: 'u1', title: 'Basics', courseIDs: ['a', 'b'] },
            { id: 'u2', title: 'Advanced', courseIDs: ['c'] }
          ]
        } as CurrentCourse['series']
      },
      startCourse: vi.fn()
    })
    mocks.confirm.mockResolvedValue(true)
  })

  it('shows all units and courses in order, retaining active state and restart', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual(['1. Basics', '2. Advanced'])
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

  it('switches across units and highlights the newly active course on reopening', async () => {
    let wrapper = mountPanel()
    await wrapper.findAll('li')[2].trigger('click')
    await flushPromises()
    expect(mocks.tutorial.startCourse).toHaveBeenCalledWith('series', 'c')
    expect(mocks.setVisible).toHaveBeenCalledWith(false)
    mocks.tutorial.currentCourse = { ...mocks.tutorial.currentCourse, ...makeCourse('c'), state: CourseState.Completed }
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

  it('keeps a series without units as one course list', () => {
    mocks.tutorial.currentCourse.series.units = []
    const wrapper = mountPanel()
    expect(wrapper.findAll('ul')).toHaveLength(1)
    expect(wrapper.findAllComponents(TutorialStatusCourseRow).map((row) => row.props('course').id)).toEqual([
      'a',
      'b',
      'c'
    ])
  })
})
