import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { Tutorial } from './tutorial'
import TutorialCourseRetryModal from './TutorialCourseRetryModal.vue'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  requestSkipOnce: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

vi.mock('@/components/editor/leave-confirm', () => ({
  editorLeaveConfirm: { requestSkipOnce: mocks.requestSkipOnce }
}))

vi.mock('@/utils/exception', () => ({
  DefaultException: class DefaultException extends Error {},
  useMessageHandle: (fn: () => unknown) => ({ fn })
}))

const global = {
  directives: {
    radar: () => undefined
  },
  stubs: {
    UIModal: {
      props: ['visible'],
      template: '<div data-testid="modal"><slot /></div>'
    },
    UIButton: {
      props: ['type'],
      template: '<button :data-type="type"><slot /></button>'
    },
    MarkdownView: {
      props: ['value'],
      template: '<div data-testid="hint">{{ value }}</div>'
    }
  },
  mocks: {
    $t: (value: { zh: string }) => value.zh
  }
}

function createTutorial(courseIDs = ['course-1', 'course-2']) {
  return {
    currentCourse: { id: 'course-1' },
    currentSeries: { id: 'series-1', courseIDs },
    endCurrentCourse: vi.fn()
  } as unknown as Tutorial
}

describe('TutorialCourseRetryModal', () => {
  it('renders the designed actions without a close button', () => {
    const wrapper = shallowMount(TutorialCourseRetryModal, {
      props: {
        visible: true,
        hint: '试试用 `stepTo`。',
        tutorial: createTutorial()
      },
      global
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('学习下一课程')
    expect(buttons[0].attributes('data-type')).toBe('secondary')
    expect(buttons[1].text()).toBe('再试一次')
    expect(wrapper.find('[data-testid="hint"]').text()).toBe('试试用 `stepTo`。')
  })

  it('closes the modal when retrying', async () => {
    const wrapper = shallowMount(TutorialCourseRetryModal, {
      props: {
        visible: true,
        hint: '再试一次。',
        tutorial: createTutorial()
      },
      global
    })

    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('starts the next course through the existing course-start route', async () => {
    mocks.push.mockReset()
    mocks.requestSkipOnce.mockReset()
    const tutorial = createTutorial()
    const wrapper = shallowMount(TutorialCourseRetryModal, {
      props: {
        visible: true,
        hint: '再试一次。',
        tutorial
      },
      global
    })

    await wrapper.findAll('button')[0].trigger('click')
    expect(mocks.requestSkipOnce).toHaveBeenCalledOnce()
    expect(tutorial.endCurrentCourse).toHaveBeenCalledOnce()
    expect(mocks.push).toHaveBeenCalledWith('/course/series-1/course-2/start')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('hides the next-course action at the end of a series', () => {
    const wrapper = shallowMount(TutorialCourseRetryModal, {
      props: {
        visible: true,
        hint: '再试一次。',
        tutorial: createTutorial(['course-1'])
      },
      global
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].text()).toBe('再试一次')
  })
})
