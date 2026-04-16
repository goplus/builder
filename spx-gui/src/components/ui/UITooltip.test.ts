import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UITooltip from './UITooltip.vue'
import { providePopupStack } from './popup'
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

async function flushTooltip() {
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

describe('UITooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    floatingMocks.computePosition.mockResolvedValue({
      x: 10,
      y: 18,
      strategy: 'fixed',
      placement: 'top',
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

  it('opens only after the configured hover delay', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UITooltip,
                  { delay: 600 },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                    default: () => h('div', 'Tooltip content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const tooltip = wrapper.getComponent(UITooltip)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await flushTooltip()
    expect(popupContainer.text()).not.toContain('Tooltip content')

    await vi.advanceTimersByTimeAsync(599)
    await flushTooltip()
    expect(popupContainer.text()).not.toContain('Tooltip content')

    await vi.advanceTimersByTimeAsync(1)
    await flushTooltip()

    expect(tooltip.emitted('update:visible')).toEqual([[true]])
    expect(popupContainer.text()).toContain('Tooltip content')
  })

  it('cancels the delayed open when the pointer leaves before the timer fires', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UITooltip,
                  { delay: 300 },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                    default: () => h('div', 'Tooltip content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const tooltip = wrapper.getComponent(UITooltip)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(150)
    await wrapper.get('[data-test-id="trigger"]').trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(300)
    await flushTooltip()

    expect(tooltip.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).not.toContain('Tooltip content')
  })

  it('does not open while disabled and does not pass disabled through to the trigger element', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UITooltip,
                  { delay: 0, disabled: true },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                    default: () => h('div', 'Tooltip content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const tooltip = wrapper.getComponent(UITooltip)
    const trigger = wrapper.get('[data-test-id="trigger"]')
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await trigger.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(0)
    await flushTooltip()

    expect(trigger.attributes('disabled')).toBeUndefined()
    expect((trigger.element as HTMLButtonElement).disabled).toBe(false)
    expect(tooltip.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).not.toContain('Tooltip content')
  })

  it('keeps the tooltip open while the pointer moves from trigger into content', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UITooltip,
                  { delay: 0 },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                    default: () => h('div', 'Tooltip content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(0)
    await flushTooltip()
    expect(popupContainer.text()).toContain('Tooltip content')

    const tooltipContent = popupContainer.get('[data-ui-popup-root]')
    await wrapper.get('[data-test-id="trigger"]').trigger('mouseleave')
    await tooltipContent.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(100)
    await flushTooltip()
    expect(popupContainer.text()).toContain('Tooltip content')

    await tooltipContent.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(101)
    await flushTooltip()
    expect(popupContainer.text()).not.toContain('Tooltip content')
  })

  it('closes immediately when it becomes disabled after opening', async () => {
    const wrapper = mount(
      defineComponent({
        data() {
          return {
            disabled: false
          }
        },
        render() {
          return h(PopupProvider, null, {
            default: () =>
              h(
                UITooltip,
                { delay: 0, disabled: this.disabled },
                {
                  trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                  default: () => h('div', 'Tooltip content')
                }
              )
          })
        }
      }),
      { attachTo: document.body }
    )

    const tooltip = wrapper.getComponent(UITooltip)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(0)
    await flushTooltip()
    expect(popupContainer.text()).toContain('Tooltip content')

    await wrapper.setData({ disabled: true })
    await flushTooltip()

    expect(tooltip.emitted('update:visible')).toEqual([[true], [false]])
    expect(popupContainer.text()).not.toContain('Tooltip content')
  })
})
