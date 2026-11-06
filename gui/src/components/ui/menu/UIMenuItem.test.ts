import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { dropdownCtrlKey } from '../UIDropdown.vue'
import { ctxKey } from './UIMenu.vue'
import UIMenuItem from './UIMenuItem.vue'

function mountMenuItem(props: { closeOnClick?: boolean; disabled?: boolean } = {}) {
  const setVisible = vi.fn()
  const wrapper = mount(UIMenuItem, {
    props,
    global: {
      provide: {
        [ctxKey as symbol]: { disabled: false, inGroup: false },
        [dropdownCtrlKey as symbol]: { setVisible }
      }
    }
  })
  return { wrapper, setVisible }
}

describe('UIMenuItem', () => {
  it('closes the dropdown and emits click by default', async () => {
    const { wrapper, setVisible } = mountMenuItem()
    await wrapper.trigger('click')
    expect(setVisible).toHaveBeenCalledExactlyOnceWith(false)
    expect(wrapper.emitted('click')).toHaveLength(1)
    wrapper.unmount()
  })

  it('emits click without closing when closeOnClick is false', async () => {
    const { wrapper, setVisible } = mountMenuItem({ closeOnClick: false })
    await wrapper.trigger('click')
    expect(setVisible).not.toHaveBeenCalled()
    expect(wrapper.emitted('click')).toHaveLength(1)
    wrapper.unmount()
  })

  it.each([true, false])('does not close or emit click when disabled and closeOnClick is %s', async (closeOnClick) => {
    const { wrapper, setVisible } = mountMenuItem({ disabled: true, closeOnClick })
    await wrapper.trigger('click')
    expect(setVisible).not.toHaveBeenCalled()
    expect(wrapper.emitted('click')).toBeUndefined()
    wrapper.unmount()
  })
})
