import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UISlider from './UISlider.vue'

describe('UISlider', () => {
  it('keeps the visual rail layer non-interactive so the native range input owns hit testing', () => {
    const wrapper = mount(UISlider, {
      props: {
        value: 50
      }
    })

    const rail = wrapper.get('div.pointer-events-none')
    expect(rail.classes()).toContain('pointer-events-none')
  })

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
