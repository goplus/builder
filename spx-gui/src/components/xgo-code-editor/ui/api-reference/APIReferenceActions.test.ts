import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideLayerStack, providePopupContainer } from '@/components/ui/utils'
import type { Action, CommandInfo } from '../../common'
import APIReferenceActions from './APIReferenceActions.vue'

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn(), resolveAction: vi.fn() }))

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui: mocks }) }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (handler: () => unknown) => ({ fn: handler })
}))
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

const actions: Action[] = [
  { command: 'test.explain', arguments: ['Sprite.animate'] },
  { command: 'test.translate', arguments: ['Sprite.animate', 'zh'] },
  { command: 'test.example', arguments: ['Sprite.animate'] }
]
const commandInfos: Record<string, Pick<CommandInfo<[], void>, 'icon' | 'title'>> = {
  'test.explain': { icon: 'explain', title: { zh: '解释', en: 'Explain' } },
  'test.translate': { icon: 'modify', title: { zh: '翻译', en: 'Translate' } },
  'test.example': { icon: 'goto', title: { zh: '查看示例', en: 'View example' } }
}
const wrappers: Array<ReturnType<typeof mount>> = []

function mountActions(compact = true, availableActions = actions) {
  const parentClick = vi.fn()
  const state = reactive({ actions: availableActions, compact, disabled: false })
  const wrapper = mount(
    defineComponent({
      setup() {
        const popupContainer = ref<HTMLElement>()
        providePopupContainer(popupContainer)
        provideLayerStack()
        return () =>
          h('div', { onClick: parentClick }, [
            h(APIReferenceActions, state),
            h('input', { 'data-test-id': 'outside' }),
            h('div', { ref: popupContainer })
          ])
      }
    }),
    {
      attachTo: document.body,
      global: {
        mocks: { $t: (message: { zh: string }) => message.zh },
        directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.name) },
        stubs: { UITooltip: { props: ['disabled'], template: '<span><slot name="trigger" /></span>' } }
      }
    }
  )
  wrappers.push(wrapper)
  return { wrapper, component: wrapper.getComponent(APIReferenceActions), parentClick, state }
}

async function flushMenu() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
}

describe('API Reference actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.stubGlobal('scheduler', { postTask: async (callback: () => unknown) => callback() })
    mocks.resolveAction.mockImplementation((action: Action) => {
      const commandInfo = commandInfos[action.command]
      return commandInfo == null ? null : { ...action, title: action.title ?? commandInfo.title.zh, commandInfo }
    })
  })

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows no empty more button and omits commands that are not registered', () => {
    const { wrapper } = mountActions(true, [actions[0], { command: 'test.unavailable', arguments: [] }])
    expect(wrapper.findAll('button').map((button) => button.attributes('aria-label'))).toEqual(['解释'])
    expect(wrapper.get('button').text()).toBe('')
    expect(wrapper.get('button').find('svg').exists()).toBe(true)
  })

  it('hides the action area when no commands are available', () => {
    const { component } = mountActions(true, [{ command: 'test.unavailable', arguments: [] }])
    expect(component.find('button').exists()).toBe(false)
  })

  it.each([true, false])(
    'keeps the same actions with compact=%s and puts secondary actions in a menu',
    async (compact) => {
      const { wrapper } = mountActions(compact)
      expect(wrapper.findAll('button')).toHaveLength(2)
      await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
      await flushMenu()
      expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['翻译', '查看示例'])
      expect(wrapper.findAll('[role="menuitem"] svg')).toHaveLength(2)
      expect(document.activeElement).toBe(wrapper.get('[role="menuitem"]').element)
    }
  )

  it('executes the primary action without bubbling into code insertion', async () => {
    const { wrapper, parentClick } = mountActions()
    await wrapper.get('[aria-label="解释"]').trigger('click')
    await flushMenu()
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.explain', 'Sprite.animate')
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('executes the selected secondary action with its arguments and closes the menu', async () => {
    const { wrapper, component, parentClick } = mountActions()
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    await wrapper.get('[role="menuitem"][aria-label="翻译"]').trigger('click')
    await flushMenu()
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.translate', 'Sprite.animate', 'zh')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(component.emitted('action')).toHaveLength(1)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('supports arrow navigation and returns focus when Escape dismisses the menu', async () => {
    const { wrapper } = mountActions()
    const more = wrapper.get('[aria-label="更多 API 操作"]')
    await more.trigger('keydown', { key: 'ArrowDown' })
    await flushMenu()
    const items = wrapper.findAll('[role="menuitem"]')
    await items[0].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[1].element)
    await items[1].trigger('keydown', { key: 'Escape' })
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(more.element)
    expect(mocks.executeCommand).not.toHaveBeenCalled()
  })

  it('closes on an outside click without moving focus away from the outside input', async () => {
    const { wrapper, component } = mountActions()
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
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
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    state.disabled = true
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="解释"]').attributes('disabled')).toBeDefined()
    state.disabled = false
    await flushMenu()
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    state.actions = [actions[0]]
    await flushMenu()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="更多 API 操作"]').exists()).toBe(false)
  })
})
