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
      directives: {
        radar: {
          mounted: (element: HTMLElement, binding: { value: { name: string } }) => {
            element.setAttribute('aria-label', binding.value.name)
          }
        }
      }
    }
  })
}

describe('ImageOption actions', () => {
  it('removes an image through a native button without selecting the card', async () => {
    const wrapper = mountOption()
    const remove = wrapper.findAll('button')[1]
    expect(remove.attributes('aria-label')).toBe('移除图片')
    await remove.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[]])
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('deselects a costume through a native button', async () => {
    const wrapper = mountOption(false)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('clear')).toEqual([[]])
    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('provides a named native selection button only for interactive cards', async () => {
    const wrapper = mountOption()
    expect(wrapper.get('button').attributes('aria-label')).toBe('reference.png')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    await wrapper.setProps({ interactive: false })
    expect(wrapper.findAll('button')).toHaveLength(1)
  })
})
