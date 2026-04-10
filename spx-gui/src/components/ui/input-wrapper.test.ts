import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UINumberInput from './UINumberInput.vue'
import UITextInput from './UITextInput.vue'

describe('native wrappers for naive-ui inputs', () => {
  it('keeps external class/style on the UITextInput wrapper while forwarding other attrs', () => {
    const wrapper = mount(UITextInput, {
      props: {
        value: '',
        clearable: false
      },
      attrs: {
        class: 'mt-4 w-full',
        style: 'margin-left: 1px;',
        'data-test-id': 'text-input',
        tabindex: '-1'
      }
    })

    expect(wrapper.classes()).toContain('mt-4')
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.classes()).toContain('min-w-0')
    expect(wrapper.attributes('style')).toContain('margin-left: 1px;')

    const input = wrapper.find('.ui-text-input')
    expect(input.classes()).toContain('ui-text-input')
    expect(input.classes()).toContain('w-full')
    expect(input.classes()).toContain('min-w-0')
    expect(input.classes()).toContain('color-default')
    expect(input.classes()).toContain('ui-input-size-medium')
    expect(input.classes()).not.toContain('mt-4')
    expect(input.attributes('data-test-id')).toBe('text-input')
    expect(input.attributes('tabindex')).toBe('-1')
    expect(input.attributes('style')).not.toContain('margin-left: 1px;')
  })

  it('keeps external class/style on the UINumberInput wrapper while forwarding other attrs', () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: 1
      },
      attrs: {
        class: 'mx-2 w-32',
        style: 'position: relative;',
        'data-test-id': 'number-input',
        tabindex: '0'
      }
    })

    expect(wrapper.classes()).toContain('mx-2')
    expect(wrapper.classes()).toContain('w-32')
    expect(wrapper.classes()).not.toContain('w-full')
    expect(wrapper.classes()).toContain('min-w-0')
    expect(wrapper.attributes('style')).toContain('position: relative;')

    const input = wrapper.find('.ui-number-input')
    expect(input.classes()).toContain('ui-number-input')
    expect(input.classes()).toContain('w-full')
    expect(input.classes()).toContain('min-w-0')
    expect(input.classes()).not.toContain('mx-2')
    expect(input.attributes('data-test-id')).toBe('number-input')
    expect(input.attributes('tabindex')).toBe('0')
    expect(input.attributes('style') ?? '').not.toContain('position: relative;')
  })
})
