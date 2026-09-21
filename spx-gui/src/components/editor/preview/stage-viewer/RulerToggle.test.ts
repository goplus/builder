import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RulerToggle from './RulerToggle.vue'

const global = {
  mocks: {
    $t: (value: { en: string }) => value.en
  },
  stubs: {
    UIIcon: true
  }
}

describe('RulerToggle', () => {
  it('exposes its accessible name and pressed state', async () => {
    const wrapper = shallowMount(RulerToggle, { props: { active: false }, global })
    const button = wrapper.get('button')

    expect(button.attributes('aria-label')).toBe('Ruler')
    expect(button.attributes('aria-pressed')).toBe('false')

    await wrapper.setProps({ active: true })
    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('emits clicks only while enabled', async () => {
    const enabled = shallowMount(RulerToggle, { global })
    await enabled.get('button').trigger('click')
    expect(enabled.emitted('click')).toHaveLength(1)

    const disabled = shallowMount(RulerToggle, { props: { disabled: true }, global })
    await disabled.get('button').trigger('click')
    expect(disabled.emitted('click')).toBeUndefined()
  })
})
