import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { Tutorial } from './tutorial'
import TutorialCourseRetryModal from './TutorialCourseRetryModal.vue'

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

function createTutorial() {
  return {} as Tutorial
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
    expect(buttons).toHaveLength(1)
    expect(buttons[0].text()).toBe('继续尝试')
    expect(buttons[0].attributes('data-type')).toBe('primary')
    expect(wrapper.find('[data-testid="hint"]').text()).toBe('试试用 `stepTo`。')
    expect(wrapper.find('[data-testid="modal"]').attributes('data-mask-closable')).toBe('false')
    const image = wrapper.get('img')
    expect(image.element.parentElement?.classList.contains('aspect-[2/1]')).toBe(true)
    expect(image.attributes('src')).toContain('tutorial-retry-illustration-v2.png')
    expect(image.classes()).toContain('object-contain')
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

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
