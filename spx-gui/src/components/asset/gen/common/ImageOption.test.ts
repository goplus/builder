import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImageOption from './ImageOption.vue'

function mountOption(removable = true, interactive = true) {
  return shallowMount(ImageOption, {
    props: { label: 'reference.png', active: true, removable, clearable: !removable, interactive },
    global: {
      stubs: { UIBlockItem: false, UICornerIcon: false },
      renderStubDefaultSlot: true,
      mocks: { $t: (message: { zh: string }) => message.zh },
      directives: { radar: () => undefined }
    }
  })
}

describe('ImageOption keyboard actions', () => {
  it.each(['Enter', ' '])('removes an image with %s without selecting the card', async (key) => {
    const wrapper = mountOption()
    const remove = wrapper.get('[role="button"]')
    expect(remove.attributes('tabindex')).toBe('0')
    expect(remove.attributes('aria-label')).toBe('移除图片')
    await remove.trigger('keydown', { key })
    expect(wrapper.emitted('remove')).toEqual([[]])
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('allows deselecting a costume with the keyboard', async () => {
    const wrapper = mountOption(false)
    await wrapper.get('[role="button"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('clear')).toEqual([[]])
    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('provides a named native selection button only for interactive cards', async () => {
    const wrapper = mountOption()
    expect(wrapper.get('button').attributes('aria-label')).toBe('reference.png')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    await wrapper.setProps({ interactive: false })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('[role="button"]').attributes('tabindex')).toBe('0')
  })
})
