import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createI18n } from '@/utils/i18n'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'

const mocks = vi.hoisted(() => ({ course: vi.fn(), series: vi.fn(), startCourse: vi.fn() }))
vi.mock('@/apis/course', () => ({ getCourse: mocks.course }))
vi.mock('@/apis/course-series', () => ({ getCourseSeries: mocks.series }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../tutorial', () => ({ useTutorial: () => ({ currentCourse: null, startCourse: mocks.startCourse }) }))
vi.mock('@/components/ui', () => ({
  useMessage: () => ({ error: vi.fn() }),
  UIButton: { template: '<button><slot /></button>' },
  UIError: { template: '<div><slot /></div>' },
  UILoading: { template: '<div>Loading</div>' },
  UIImg: { template: '<img />' },
  UIModal: { template: '<div><slot /></div>' },
  UIModalClose: { template: '<button>Close</button>' }
}))

describe('Guided course completion', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  afterEach(() => client.clear())

  it('reads course details by ID after the session ends and follows cached title and order changes', async () => {
    mocks.course.mockResolvedValue({ id: 'done', title: 'Original title' })
    mocks.series.mockResolvedValue({ id: 'series', courseIDs: ['done', 'old-next'] })
    const wrapper = mount(TutorialCourseSuccessModal, {
      props: { visible: true, courseID: 'done', seriesID: 'series' },
      global: {
        plugins: [[VueQueryPlugin, { queryClient: client }], createI18n({ lang: 'en' })],
        directives: { radar: {} }
      }
    })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Original title course completed')
      client.setQueryData(['course', 'done'], { id: 'done', title: 'Updated title' })
      client.setQueryData(['course-series', 'series'], { id: 'series', courseIDs: ['old-next', 'done', 'new-next'] })
      await flushPromises()
      expect(wrapper.text()).toContain('Updated title course completed')
      const next = wrapper.findAll('button').find((button) => button.text() === 'Learn next course')!
      await next.trigger('click')
      await flushPromises()
      expect(mocks.startCourse).toHaveBeenCalledWith('series', 'new-next')
    } finally {
      wrapper.unmount()
    }
  })
})
