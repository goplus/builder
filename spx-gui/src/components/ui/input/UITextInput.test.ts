import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UITextInput from './UITextInput.vue'

function getNativeInput(wrapper: ReturnType<typeof mount<typeof UITextInput>>) {
  return wrapper.get('input')
}

describe('UITextInput', () => {
  it('emits focus and blur from the native input element', async () => {
    const wrapper = mount(UITextInput, {
      props: {
        value: ''
      }
    })

    const input = getNativeInput(wrapper)
    await input.trigger('focus')
    await input.trigger('blur')

    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('emits focus and blur from the native textarea element', async () => {
    const wrapper = mount(UITextInput, {
      props: {
        value: '',
        type: 'textarea'
      }
    })

    const textarea = wrapper.get('textarea')
    await textarea.trigger('focus')
    await textarea.trigger('blur')

    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('passes maxlength to the native text control', () => {
    const inputWrapper = mount(UITextInput, {
      props: {
        value: '',
        maxlength: 100
      }
    })
    expect(inputWrapper.get('input').attributes('maxlength')).toBe('100')

    const textareaWrapper = mount(UITextInput, {
      props: {
        value: '',
        type: 'textarea',
        maxlength: 200
      }
    })
    expect(textareaWrapper.get('textarea').attributes('maxlength')).toBe('200')
  })
})
