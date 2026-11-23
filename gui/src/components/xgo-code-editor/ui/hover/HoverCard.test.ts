import { enableAutoUnmount, flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { provideLayerStack } from '@/components/ui/utils'
import type { CodeEditor } from '../../code-editor'
import type { Action, CommandInfo } from '../../common'
import { CodeEditorUIController, builtInCommandApplyCodeAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import HoverCard from './HoverCard.vue'

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn(), resolveAction: vi.fn() }))

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: vi.fn() }))
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
enableAutoUnmount(afterEach)

function mountCard(availableActions = actions) {
  return mount(
    defineComponent({
      setup() {
        provideLayerStack()
        return () => h(HoverCard, { actions: availableActions })
      }
    }),
    {
      attachTo: document.body,
      global: {
        plugins: [createI18n({ lang: 'zh' })],
        directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.label ?? value.name) },
        stubs: { UITooltip: { props: ['disabled'], template: '<span><slot name="trigger" /></span>' } }
      }
    }
  )
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
    vi.mocked(useCodeEditorUICtx).mockReturnValue({ ui: mocks as unknown as CodeEditorUIController })
    mocks.resolveAction.mockImplementation((action: Action) => {
      const commandInfo = commandInfos[action.command]
      return commandInfo == null ? null : { ...action, title: action.title ?? commandInfo.title, commandInfo }
    })
  })

  afterEach(() => vi.useRealTimers())

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
    expect(wrapper.findAll('footer button:not([aria-expanded])').map((button) => button.text())).toEqual([
      '解释',
      '翻译',
      '查看示例'
    ])
    await wrapper.get('[aria-label="更多操作"]').trigger('click')
    await flushMenu()
    const menu = wrapper.getComponent(HoverCard).get('[aria-label="操作"]')
    const menuItems = menu.findAll('.ui-menu-item')
    expect(menuItems.map((item) => item.text())).toEqual(['复制写法', '收藏'])
    await menuItems[1].trigger('click')
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith('test.favorite')
    expect(wrapper.find('[aria-label="操作"]').exists()).toBe(false)
  })
})

describe('HoverCard', () => {
  it('renders localized, server, and command titles when the language changes', async () => {
    const i18n = createI18n({ lang: 'en' })
    const ui = new CodeEditorUIController({ uri: 'file:///main.spx' }, {} as CodeEditor, i18n, {
      renameHandler: async () => {}
    })
    ui.registerCommand(builtInCommandApplyCodeAction, {
      icon: 'fix',
      title: { en: 'Quick fix', zh: '快速修复' },
      handler: vi.fn()
    })
    vi.mocked(useCodeEditorUICtx).mockReturnValue({ ui })
    const wrapper = shallowMount(HoverCard, {
      props: {
        actions: [
          {
            title: { en: 'Merge var declarations', zh: '合并 var 声明' },
            command: builtInCommandApplyCodeAction,
            arguments: []
          },
          {
            title: { en: 'Server action', zh: 'Server action' },
            command: builtInCommandApplyCodeAction,
            arguments: []
          },
          { command: builtInCommandApplyCodeAction, arguments: [] }
        ]
      },
      global: { plugins: [i18n], renderStubDefaultSlot: true }
    })
    onTestFinished(() => ui.dispose())
    const titles = () => wrapper.findAll('action-button-stub').map((button) => button.text())
    expect(titles()).toEqual(['Merge var declarations', 'Server action', 'Quick fix'])
    expect(wrapper.get('action-button-stub').attributes('icon')).toBe('fix')
    i18n.setLang('zh')
    await nextTick()
    expect(titles()).toEqual(['合并 var 声明', 'Server action', '快速修复'])
    i18n.setLang('en')
    await nextTick()
    expect(titles()).toEqual(['Merge var declarations', 'Server action', 'Quick fix'])
  })
})
