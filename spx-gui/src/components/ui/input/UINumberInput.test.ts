import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UINumberInput from './UINumberInput.vue'

function getNativeInput(wrapper: ReturnType<typeof mount<typeof UINumberInput>>) {
  return wrapper.get('input')
}

describe('UINumberInput', () => {
  it('steps from an empty value to the nearest valid value inside a fully negative range', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: null,
        min: -20,
        max: -10,
        step: 1
      }
    })

    await getNativeInput(wrapper).trigger('keydown', { key: 'ArrowUp' })

    expect(wrapper.emitted('update:value')).toEqual([[-10]])
  })

  it('preserves precision when stepping values rendered in scientific notation', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: 1e-7,
        step: 1e-7
      }
    })

    await getNativeInput(wrapper).trigger('keydown', { key: 'ArrowUp' })

    expect(wrapper.emitted('update:value')).toEqual([[2e-7]])
  })

  it('clamps to the configured minimum when stepping from an empty value above zero', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: null,
        min: 10,
        max: 20,
        step: 1
      }
    })

    await getNativeInput(wrapper).trigger('keydown', { key: 'ArrowDown' })

    expect(wrapper.emitted('update:value')).toEqual([[10]])
  })

  it('does not throw when scientific-notation precision exceeds toFixed limits', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: 1e-101,
        step: 1e-101
      }
    })

    await expect(getNativeInput(wrapper).trigger('keydown', { key: 'ArrowUp' })).resolves.toBeUndefined()
    expect(wrapper.emitted('update:value')).toEqual([[2e-101]])
  })

  it('keeps work-in-progress decimal input without emitting while typing', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: null
      }
    })

    const input = getNativeInput(wrapper)
    await input.trigger('focus')
    await input.setValue('1.')

    expect((input.element as HTMLInputElement).value).toBe('1.')
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  it('commits work-in-progress decimal input on blur', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: null
      }
    })

    const input = getNativeInput(wrapper)
    await input.trigger('focus')
    await input.setValue('.5')
    await input.trigger('blur')

    expect(wrapper.emitted('update:value')).toEqual([[0.5]])
    expect((input.element as HTMLInputElement).value).toBe('0.5')
  })

  it('clamps invalid numeric text to max on blur', async () => {
    const wrapper = mount(UINumberInput, {
      props: {
        value: null,
        max: 10
      }
    })

    const input = getNativeInput(wrapper)
    await input.trigger('focus')
    await input.setValue('999')
    await input.trigger('blur')

    expect(wrapper.emitted('update:value')).toEqual([[10]])
    expect((input.element as HTMLInputElement).value).toBe('10')
  })
})
