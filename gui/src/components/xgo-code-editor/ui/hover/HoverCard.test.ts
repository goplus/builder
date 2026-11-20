import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import type { CodeEditor } from '../../code-editor'
import { CodeEditorUIController, builtInCommandApplyCodeAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import HoverCard from './HoverCard.vue'

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: vi.fn() }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: () => void) => ({ fn })
}))

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
    onTestFinished(() => {
      wrapper.unmount()
      ui.dispose()
    })
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
