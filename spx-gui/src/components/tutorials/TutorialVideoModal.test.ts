import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApiVideoModal from './ApiVideoModal.vue'
import TutorialStoryVideoModal from './TutorialStoryVideoModal.vue'

const global = {
  directives: { radar: {} },
  mocks: {
    $t: (message: { en: string; zh: string }) => message.zh
  },
  stubs: {
    UIModal: {
      props: ['visible', 'maskClosable'],
      emits: ['update:visible'],
      template:
        '<div data-testid="modal" :data-mask-closable="String(maskClosable)"><button data-testid="mask" @click="$emit(\'update:visible\', false)" /><slot /></div>'
    },
    UIButton: {
      props: ['type', 'size'],
      template: '<button data-testid="continue" :data-type="type" :data-size="size"><slot /></button>'
    },
    UIIcon: true
  }
}

describe('tutorial video modals', () => {
  it('requires the continue button to dismiss an API guide video', async () => {
    const wrapper = mount(ApiVideoModal, {
      props: {
        visible: false,
        video: {
          title: { en: 'step', zh: 'step 前进' },
          src: '/videos/step.mp4'
        }
      },
      global
    })

    expect(wrapper.get('[data-testid="modal"]').attributes('data-mask-closable')).toBe('false')
    expect(wrapper.findComponent({ name: 'UIModalClose' }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('教程引导')
    expect(wrapper.get('[data-testid="continue"]').attributes()).toMatchObject({
      'data-type': 'primary',
      'data-size': 'large'
    })
    expect(wrapper.get('[data-testid="continue"]').text()).toBe('继续进行')

    await wrapper.get('[data-testid="mask"]').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await wrapper.get('[data-testid="continue"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('requires the start button to dismiss the story video', async () => {
    const wrapper = mount(TutorialStoryVideoModal, {
      props: { visible: false, src: '/videos/story.mp4' },
      global
    })

    expect(wrapper.get('[data-testid="modal"]').attributes('data-mask-closable')).toBe('false')
    expect(wrapper.findComponent({ name: 'UIModalClose' }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('教程引导')
    expect(wrapper.get('[data-testid="continue"]').attributes()).toMatchObject({
      'data-type': 'primary',
      'data-size': 'large'
    })
    expect(wrapper.get('[data-testid="continue"]').text()).toBe('开始课程')

    await wrapper.get('[data-testid="mask"]').trigger('click')
    expect(wrapper.emitted('continue')).toBeUndefined()

    await wrapper.get('[data-testid="continue"]').trigger('click')
    expect(wrapper.emitted('continue')).toHaveLength(1)
  })
})
