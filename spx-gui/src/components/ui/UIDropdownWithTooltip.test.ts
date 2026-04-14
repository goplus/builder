import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UIDropdownWithTooltip from './UIDropdownWithTooltip.vue'
import UIConfigProvider from './UIConfigProvider.vue'
import UIModal from './modal/UIModal.vue'
import { providePopupStack } from './popup'
import { UI_POPUP_KIND_ATTR } from './popup/stack'
import { providePopupContainer } from './utils'

const floatingMocks = vi.hoisted(() => {
  return {
    computePosition: vi.fn(),
    autoUpdate: vi.fn()
  }
})

vi.mock('@floating-ui/dom', () => ({
  computePosition: floatingMocks.computePosition,
  autoUpdate: floatingMocks.autoUpdate,
  offset: (value: unknown) => ({ name: 'offset', value }),
  flip: () => ({ name: 'flip' }),
  shift: (value: unknown) => ({ name: 'shift', value }),
  arrow: (value: unknown) => ({ name: 'arrow', value })
}))

async function flushPopup() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const PopupProvider = defineComponent({
  setup(_, { slots }) {
    const popupContainer = ref<HTMLElement>()
    providePopupContainer(popupContainer)
    providePopupStack()

    return () => h('div', [slots.default?.(), h('div', { ref: popupContainer, 'data-test-id': 'popup-container' })])
  }
})

describe('UIDropdownWithTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    floatingMocks.computePosition.mockResolvedValue({
      x: 16,
      y: 24,
      strategy: 'fixed',
      placement: 'bottom',
      middlewareData: {
        arrow: {
          x: 4,
          y: 0
        }
      }
    })
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return vi.fn()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows the tooltip on hover and hides it when the dropdown opens', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(UIDropdownWithTooltip, null, {
                  trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Trigger'),
                  'tooltip-content': () => h('div', 'Tooltip content'),
                  'dropdown-content': () => h('div', 'Dropdown content')
                })
            })
        }
      }),
      { attachTo: document.body }
    )

    const popupContainer = wrapper.get('[data-test-id="popup-container"]')
    const trigger = wrapper.get('[data-test-id="trigger"]')

    await trigger.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(600)
    await flushPopup()
    expect(popupContainer.text()).toContain('Tooltip content')
    expect(popupContainer.text()).not.toContain('Dropdown content')

    await trigger.trigger('click')
    await flushPopup()
    expect(popupContainer.text()).toContain('Dropdown content')
    expect(popupContainer.text()).not.toContain('Tooltip content')

    const dropdownRoot = document.body.querySelector(`[${UI_POPUP_KIND_ATTR}="dropdown"]`)
    expect(dropdownRoot).toBeInstanceOf(HTMLElement)
    expect((dropdownRoot as HTMLElement).style.visibility).toBe('visible')
  })

  it('shows the tooltip and dropdown when used inside UIModal', async () => {
    mount(
      defineComponent({
        setup() {
          return () =>
            h(UIConfigProvider, null, {
              default: () =>
                h(
                  UIModal,
                  {
                    visible: true,
                    autoFocus: false,
                    maskClosable: false,
                    'onUpdate:visible': () => undefined
                  },
                  {
                    default: () =>
                      h(UIDropdownWithTooltip, null, {
                        trigger: () => h('button', { 'data-test-id': 'modal-trigger' }, 'Trigger'),
                        'tooltip-content': () => h('div', 'Tooltip content'),
                        'dropdown-content': () => h('div', 'Dropdown content')
                      })
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    await flushPopup()

    const trigger = document.body.querySelector('[data-test-id="modal-trigger"]')
    expect(trigger).toBeInstanceOf(HTMLElement)
    ;(trigger as HTMLElement).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(600)
    await flushPopup()

    const tooltipRoot = document.body.querySelector(`[${UI_POPUP_KIND_ATTR}="tooltip"]`)
    expect(tooltipRoot).toBeInstanceOf(HTMLElement)
    expect((tooltipRoot as HTMLElement).style.visibility).toBe('visible')
    ;(trigger as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPopup()

    const dropdownRoot = document.body.querySelector(`[${UI_POPUP_KIND_ATTR}="dropdown"]`)
    expect(dropdownRoot).toBeInstanceOf(HTMLElement)
    expect((dropdownRoot as HTMLElement).style.visibility).toBe('visible')
  })
})
