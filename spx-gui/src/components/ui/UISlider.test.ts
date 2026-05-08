import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UISlider from './UISlider.vue'

describe('UISlider', () => {
  it('emits updates while dragging when updateOn is input', async () => {
    const wrapper = mount(UISlider, {
      props: {
        value: 0,
        updateOn: 'input'
      }
    })

    const input = wrapper.get('input[type="range"]')
    ;(input.element as HTMLInputElement).value = '42'
    await input.trigger('input')

    expect(wrapper.emitted('update:value')).toEqual([[42]])
  })

  it('emits updates on change by default', async () => {
    const wrapper = mount(UISlider, {
      props: {
        value: 0
      }
    })

    const input = wrapper.get('input[type="range"]')
    ;(input.element as HTMLInputElement).value = '42'
    await input.trigger('change')

    expect(wrapper.emitted('update:value')).toEqual([[42]])
  })
})
