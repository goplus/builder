import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TutorialCourseReminderModal from './TutorialCourseReminderModal.vue'

const global = {
  directives: {
    radar: () => undefined
  },
  stubs: {
    UIModal: {
      props: ['visible', 'maskClosable'],
      inheritAttrs: false,
      template: '<div data-testid="modal" :data-mask-closable="String(maskClosable)"><slot /></div>'
    },
    UIButton: {
      props: ['type'],
      template: '<button :data-type="type"><slot /></button>'
    }
  },
  mocks: {
    $t: (value: { zh: string }) => value.zh
  }
}

describe('TutorialCourseReminderModal', () => {
  it('renders the shared in-course reminder presentation', () => {
    const wrapper = shallowMount(TutorialCourseReminderModal, {
      props: { visible: true },
      slots: { default: '<p data-testid="content">提醒内容</p>' },
      global
    })

    expect(wrapper.get('[data-testid="modal"]').attributes('data-mask-closable')).toBe('false')
    const content = wrapper.get('[data-testid="content"]')
    expect(content.text()).toBe('提醒内容')
    expect(content.element.parentElement?.classList.contains('min-h-[164px]')).toBe(false)
    expect(content.element.parentElement?.classList.contains('py-8')).toBe(true)
    expect(wrapper.get('button').text()).toBe('继续尝试')
    expect(wrapper.get('button').attributes('data-type')).toBe('primary')

    const image = wrapper.get('img')
    expect(image.element.parentElement?.classList.contains('aspect-[2/1]')).toBe(true)
    expect(image.attributes('src')).toContain('tutorial-retry-illustration-v3.svg')
    expect(image.classes()).toContain('object-contain')
  })

  it('closes when the learner continues', async () => {
    const wrapper = shallowMount(TutorialCourseReminderModal, {
      props: { visible: true },
      global
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
