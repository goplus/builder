import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideLayerStack, providePopupContainer } from '@/components/ui/utils'
import type { InternalAction } from './code-editor-ui'
import MoreActions from './MoreActions.vue'

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
  {
    command: 'test.translate',
    arguments: ['Sprite.animate', 'zh'],
    title: { en: 'Translate', zh: '翻译' },
    commandInfo: { icon: 'modify' }
  },
  {
    command: 'test.example',
    arguments: ['Sprite.animate'],
    title: { en: 'View example', zh: '查看示例' },
    commandInfo: { icon: 'goto' }
  }
] as InternalAction[]
enableAutoUnmount(afterEach)

function mountActions() {
  const parentClick = vi.fn()
  const state = reactive({ actions, disabled: false })
  const wrapper = mount(
    defineComponent({
      setup() {
        const popupContainer = ref<HTMLElement>()
        providePopupContainer(popupContainer)
        provideLayerStack()
        return () => h('div', { onClick: parentClick }, [h(MoreActions, state), h('div', { ref: popupContainer })])
      }
    }),
    {
      attachTo: document.body,
      global: {
        mocks: { $t: (message: { zh: string }) => message.zh },
        directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.label ?? value.name) }
      }
    }
  )
  return { wrapper, component: wrapper.getComponent(MoreActions), parentClick, state }
}

async function flushMenu() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
}

describe('More actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => vi.useRealTimers())

  it('emits the selected action with its arguments and closes the menu', async () => {
    const { wrapper, component, parentClick } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    parentClick.mockClear()
    await wrapper.get('[aria-label="翻译"]').trigger('click')
    await flushMenu()
    expect(component.emitted('select')).toEqual([[actions[0]]])
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(false)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('uses the dropdown Escape behavior to dismiss the menu', async () => {
    const { wrapper, component } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    await wrapper.get('[aria-label="翻译"]').trigger('keydown', { key: 'Escape' })
    await flushMenu()
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(false)
    expect(component.emitted('select')).toBeUndefined()
  })

  it('starts closed when actions become available again', async () => {
    const { wrapper, state } = mountActions()
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(true)
    state.actions = []
    await flushMenu()
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="更多操作"]').exists()).toBe(false)
    state.actions = actions
    await flushMenu()
    expect(wrapper.get('[aria-label="更多操作"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(false)
  })
})
