import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { builtInCommandApplyCodeAction } from '../code-editor-ui'
import type { ContextMenuController, MenuData } from '.'
import ContextMenu from './ContextMenu.vue'

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: () => void) => ({ fn })
}))

describe('ContextMenu', () => {
  it('updates an open menu when the language changes', async () => {
    const i18n = createI18n({ lang: 'en' })
    const title = { en: 'Merge var declarations', zh: '合并 var 声明' }
    const data: MenuData = {
      groups: [
        [
          {
            title,
            command: builtInCommandApplyCodeAction,
            commandInfo: { icon: 'fix', title, handler: vi.fn() },
            arguments: []
          }
        ]
      ],
      position: { top: 20, left: 10 }
    }
    const wrapper = shallowMount(ContextMenu, {
      props: {
        controller: { executeMenuItem: vi.fn() } as unknown as ContextMenuController,
        data
      },
      global: { plugins: [i18n], renderStubDefaultSlot: true }
    })
    onTestFinished(() => wrapper.unmount())
    expect(wrapper.text()).toBe(title.en)
    i18n.setLang('zh')
    await nextTick()
    expect(wrapper.text()).toBe(title.zh)
    i18n.setLang('en')
    await nextTick()
    expect(wrapper.text()).toBe(title.en)
  })
})
