import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { Tutorial } from './tutorial'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'

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

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (value: { zh: string }) => value.zh })
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
      props: ['maskClosable'],
      inheritAttrs: false,
      template: '<div data-testid="modal" :data-mask-closable="String(maskClosable)"><slot /></div>'
    },
    UIButton: {
      template: '<button><slot /></button>'
    },
    MarkdownView: {
      props: ['value'],
      template: '<div data-testid="comment">{{ value }}</div>'
    }
  },
  mocks: {
    $t: (value: { zh: string }) => value.zh
  }
}

function createTutorial() {
  return {
    restartCourse: vi.fn(),
    endCurrentCourse: vi.fn()
  } as unknown as Tutorial
}

function mountModal(comment: string | null = null) {
  const tutorial = createTutorial()
  const wrapper = shallowMount(TutorialCourseSuccessModal, {
    props: {
      completion: {
        course: { id: 'course-1', title: '1.2 修改步数' },
        series: { id: 'series-1', courseIDs: ['course-1', 'course-2', 'course-3'] }
      } as never,
      comment,
      tutorial
    },
    global
  })
  return { tutorial, wrapper }
}

describe('TutorialCourseSuccessModal', () => {
  it('shows a complete fallback and all actions immediately while the evaluation is loading', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="comment"]').text()).toBe('1.2 修改步数课程已完成')
    expect(wrapper.find('[data-testid="modal"]').attributes('data-mask-closable')).toBe('false')
    expect(wrapper.find('[data-testid="comment"]').classes()).toContain('text-center')
    const image = wrapper.get('img')
    expect(image.element.parentElement?.classList.contains('aspect-[2/1]')).toBe(true)
    expect(image.attributes('src')).toContain('tutorial-success-illustration-v3.svg')
    expect(image.classes()).toContain('object-contain')
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      '再试一次',
      '返回系列课程',
      '学习下一个课程'
    ])
  })

  it('hides a series sequence prefix from the fallback evaluation', () => {
    const tutorial = createTutorial()
    const wrapper = shallowMount(TutorialCourseSuccessModal, {
      props: {
        completion: {
          course: { id: 'course-1', title: '4. 第一行代码' },
          series: { id: 'series-1', courseIDs: ['course-1'] }
        } as never,
        comment: null,
        tutorial
      },
      global
    })

    expect(wrapper.find('[data-testid="comment"]').text()).toBe('第一行代码课程已完成')
  })

  it('navigates by series order without ending tutorial mode before the handoff', async () => {
    mocks.push.mockReset()
    mocks.requestSkipOnce.mockReset()
    const { tutorial, wrapper } = mountModal('做得好！')

    await wrapper.findAll('button')[2].trigger('click')

    expect(mocks.requestSkipOnce).toHaveBeenCalledOnce()
    expect(mocks.push).toHaveBeenCalledWith('/course/series-1/course-2/start')
    expect(tutorial.endCurrentCourse).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('returns to the series page without ending tutorial mode before navigation', async () => {
    mocks.push.mockReset()
    mocks.requestSkipOnce.mockReset()
    const { tutorial, wrapper } = mountModal('做得好！')

    await wrapper.findAll('button')[1].trigger('click')

    expect(mocks.requestSkipOnce).toHaveBeenCalledOnce()
    expect(mocks.push).toHaveBeenCalledWith('/course-series/series-1')
    expect(tutorial.endCurrentCourse).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
