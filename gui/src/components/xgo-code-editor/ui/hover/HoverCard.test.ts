import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideLayerStack, providePopupContainer } from '@/components/ui/utils'
import type { Action, CommandInfo } from '../../common'
import HoverCard from './HoverCard.vue'

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
  'test.example': { icon: 'goto', title: { zh: '查看示例', en: 'View example' } },
  'test.copy': { icon: 'copy', title: { zh: '复制写法', en: 'Copy snippet' } },
  'test.favorite': { icon: 'copilot', title: { zh: '收藏', en: 'Favorite' } }
}
const wrappers: Array<ReturnType<typeof mount>> = []

function mountCard(availableActions = actions) {
  const state = reactive({ actions: availableActions, disabled: false })
  const wrapper = mount(
    defineComponent({
      setup() {
        const popupContainer = ref<HTMLElement>()
        providePopupContainer(popupContainer)
        provideLayerStack()
        return () => h('div', [h(HoverCard, state), h('div', { ref: popupContainer })])
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
  return wrapper
}

async function flushMenu() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
}

describe('HoverCard footer', () => {
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

  it('shows three actions inline without a more button', async () => {
    const wrapper = mountCard()
    const buttons = wrapper.findAll('footer button')
    expect(buttons.map((button) => button.text())).toEqual(['解释', '翻译', '查看示例'])
    await buttons[1].trigger('click')
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.translate', 'Sprite.animate', 'zh')
  })

  it('shows the first three actions inline and puts the rest in the menu in order', async () => {
    const wrapper = mountCard([
      ...actions,
      { command: 'test.copy', arguments: [] },
      { command: 'test.favorite', arguments: [] }
    ])
    expect(wrapper.findAll('footer button:not([aria-haspopup])').map((button) => button.text())).toEqual([
      '解释',
      '翻译',
      '查看示例'
    ])
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    const menuItems = wrapper.findAll('[role="menuitem"]')
    expect(menuItems.map((item) => item.text())).toEqual(['复制写法', '收藏'])
    await menuItems[1].trigger('click')
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.favorite')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
