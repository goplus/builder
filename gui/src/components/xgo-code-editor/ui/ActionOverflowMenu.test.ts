import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideLayerStack, providePopupContainer } from '@/components/ui/utils'
import type { InternalAction } from './code-editor-ui'
import ActionOverflowMenu from './ActionOverflowMenu.vue'

vi.mock('@floating-ui/dom', () => ({
  computePosition: async () => ({ x: 0, y: 0, strategy: 'fixed', placement: 'bottom-end', middlewareData: {} }),
  autoUpdate: (_reference: unknown, _floating: unknown, update: () => void) => {
    update()
    return () => undefined
  },
  offset: (value: unknown) => ({ name: 'offset', value }),
  flip: () => ({ name: 'flip' }),
  shift: (value: unknown) => ({ name: 'shift', value })
}))

const actions = [
  { command: 'test.translate', arguments: ['Sprite.animate', 'zh'], title: '翻译', commandInfo: { icon: 'modify' } },
  { command: 'test.example', arguments: ['Sprite.animate'], title: '查看示例', commandInfo: { icon: 'goto' } }
] as InternalAction[]
const wrappers: Array<ReturnType<typeof mount>> = []

function mountActions() {
  const parentClick = vi.fn()
  const state = reactive({ actions, disabled: false })
  const wrapper = mount(
    defineComponent({
      setup() {
        const popupContainer = ref<HTMLElement>()
        providePopupContainer(popupContainer)
        provideLayerStack()
        return () =>
          h('div', { onClick: parentClick }, [
            h(ActionOverflowMenu, state),
            h('input', { 'data-test-id': 'outside' }),
            h('div', { ref: popupContainer })
          ])
      }
    }),
    {
      attachTo: document.body,
      global: {
        mocks: { $t: (message: { zh: string }) => message.zh },
        directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.label ?? value.name) },
        stubs: { UITooltip: { props: ['disabled'], template: '<span><slot name="trigger" /></span>' } }
      }
    }
  )
  wrappers.push(wrapper)
  return { wrapper, component: wrapper.getComponent(ActionOverflowMenu), parentClick, state }
}

async function flushMenu() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
}

describe('Action overflow menu', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('scheduler', { postTask: async (callback: () => unknown) => callback() })
  })

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('emits the selected action with its arguments and closes the menu', async () => {
    const { wrapper, component, parentClick } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    parentClick.mockClear()
    await wrapper.get('[role="menuitem"][aria-label="翻译"]').trigger('click')
    await flushMenu()
    expect(component.emitted('select')).toEqual([[actions[0]]])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('supports arrow navigation and returns focus when Escape dismisses the menu', async () => {
    const { wrapper } = mountActions()
    const more = wrapper.get('[aria-label="更多操作"]')
    await more.trigger('keydown', { key: 'ArrowDown' })
    await flushMenu()
    const items = wrapper.findAll('[role="menuitem"]')
    await items[0].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[1].element)
    await items[1].trigger('keydown', { key: 'Escape' })
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(more.element)
    expect(wrapper.getComponent(ActionOverflowMenu).emitted('select')).toBeUndefined()
  })

  it('closes on an outside click without moving focus away from the outside input', async () => {
    const { wrapper, component } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    const outside = wrapper.get<HTMLInputElement>('[data-test-id="outside"]')
    outside.element.focus()
    await outside.trigger('click')
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(outside.element)
    expect(component.emitted('dismiss')).toHaveLength(1)
  })

  it('closes the menu when actions become unavailable or disabled', async () => {
    const { wrapper, state } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    state.disabled = true
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="更多操作"]').attributes('disabled')).toBeDefined()
    state.disabled = false
    await flushMenu()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    state.actions = []
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="更多操作"]').exists()).toBe(false)
  })
})
