import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideLayerStack, providePopupContainer } from '@/components/ui/utils'
import type { Action, CommandInfo } from '../../common'
import APIReferenceActions from './APIReferenceActions.vue'

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn(), resolveAction: vi.fn(), useContentSize: vi.fn() }))

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui: mocks }) }))
vi.mock('@/utils/dom', () => ({ useContentSize: mocks.useContentSize }))
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
  'test.example': { icon: 'goto', title: { zh: '查看示例', en: 'View example' } },
  'test.copy': { icon: 'copy', title: { zh: '复制写法', en: 'Copy snippet' } },
  'test.favorite': { icon: 'copilot', title: { zh: '收藏', en: 'Favorite' } }
}
const wrappers: Array<ReturnType<typeof mount>> = []
let containerSize: Ref<{ width: number; height: number } | null>

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

async function resizeActions(wrapper: ReturnType<typeof mount>, width: number, buttonWidths: number[]) {
  const measurement = wrapper.get<HTMLElement>('[aria-hidden="true"]')
  measurement.element.style.columnGap = '4px'
  measurement.findAll('button').forEach((button, i) => {
    vi.spyOn(button.element as HTMLElement, 'offsetWidth', 'get').mockReturnValue(buttonWidths[i])
  })
  vi.spyOn(measurement.element.lastElementChild as HTMLElement, 'offsetWidth', 'get').mockReturnValue(24)
  containerSize.value = { width, height: 32 }
  await flushMenu()
}

describe('API Reference actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    containerSize = ref(null)
    mocks.useContentSize.mockReturnValue(containerSize)
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

  it('keeps search results compact and puts secondary actions in a menu', async () => {
    const { wrapper } = mountActions()
    expect(wrapper.findAll('button')).toHaveLength(2)
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['翻译', '查看示例'])
    expect(wrapper.findAll('[role="menuitem"] svg')).toHaveLength(2)
    expect(document.activeElement).toBe(wrapper.get('[role="menuitem"]').element)
  })

  it('shows all three detail actions when they fit without reserving an empty more button', async () => {
    const { wrapper } = mountActions(false)
    await resizeActions(wrapper, 232, [64, 64, 96])
    expect(wrapper.findAll('[data-inline-action]').map((button) => button.text())).toEqual(['解释', '翻译', '查看示例'])
    expect(wrapper.find('[aria-label="更多 API 操作"]').exists()).toBe(false)
    const measurement = wrapper.get('[aria-hidden="true"]')
    expect(measurement.findAll('button').every((button) => button.attributes('disabled') != null)).toBe(true)
    expect(measurement.findAll('button').every((button) => button.attributes('tabindex') === '-1')).toBe(true)
    await wrapper.get('[data-inline-action][aria-label="翻译"]').trigger('click')
    await flushMenu()
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.translate', 'Sprite.animate', 'zh')
  })

  it('puts only overflowing detail actions in more and restores them when space grows', async () => {
    const fiveActions = [
      ...actions,
      { command: 'test.copy', arguments: [] },
      { command: 'test.favorite', arguments: [] }
    ]
    const { wrapper, component, state } = mountActions(false, fiveActions)
    await resizeActions(wrapper, 260, [64, 64, 96, 96, 64])
    expect(wrapper.findAll('[data-inline-action]').map((button) => button.text())).toEqual(['解释', '翻译', '查看示例'])
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['复制写法', '收藏'])
    await wrapper.get('[role="menuitem"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(wrapper.findAll('[role="menuitem"]')[1].element)
    await resizeActions(wrapper, 380, [64, 64, 96, 96, 64])
    expect(wrapper.findAll('[data-inline-action]')).toHaveLength(4)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[aria-label="更多 API 操作"]').element)
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    expect(wrapper.get('[role="menuitem"]').text()).toBe('收藏')
    await resizeActions(wrapper, 400, [64, 64, 96, 96, 64])
    expect(wrapper.findAll('[data-inline-action]')).toHaveLength(5)
    expect(wrapper.find('[aria-label="更多 API 操作"]').exists()).toBe(false)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(component.emitted('menuVisibleChange')?.at(-1)).toEqual([false])
    expect(document.activeElement).toBe(wrapper.get('[data-inline-action]').element)
    state.disabled = true
    await flushMenu()
    expect(wrapper.findAll('[data-inline-action]').every((button) => button.attributes('disabled') != null)).toBe(true)
  })

  it('recalculates detail overflow when action labels change', async () => {
    const { wrapper, state } = mountActions(false)
    await resizeActions(wrapper, 232, [64, 64, 96])
    state.actions = actions.map((action) => ({ ...action, title: commandInfos[action.command].title.en }))
    await flushMenu()
    await resizeActions(wrapper, 232, [80, 88, 120])
    expect(wrapper.findAll('[data-inline-action]').map((button) => button.text())).toEqual(['Explain', 'Translate'])
    await wrapper.get('[aria-label="更多 API 操作"]').trigger('click')
    await flushMenu()
    expect(wrapper.get('[role="menuitem"]').text()).toBe('View example')
  })

  it('preserves focus when resizing removes an inline action or the closed more button', async () => {
    const { wrapper } = mountActions(false)
    await resizeActions(wrapper, 232, [64, 64, 96])
    wrapper.findAll<HTMLButtonElement>('[data-inline-action]')[2].element.focus()
    await resizeActions(wrapper, 160, [64, 64, 96])
    const more = wrapper.get('[aria-label="更多 API 操作"]')
    expect(document.activeElement).toBe(more.element)
    await more.trigger('keydown', { key: 'ArrowDown' })
    await flushMenu()
    await wrapper.get('[role="menuitem"]').trigger('keydown', { key: 'Escape' })
    await flushMenu()
    expect(document.activeElement).toBe(more.element)
    await resizeActions(wrapper, 232, [64, 64, 96])
    expect(wrapper.find('[aria-label="更多 API 操作"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-inline-action]').element)
  })

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
