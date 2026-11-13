import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, shallowRef } from 'vue'
import type { APIReferenceItem } from '../api-reference'
import { APIReferenceController } from './api-reference'
import { createI18n } from '@/utils/i18n'
import type { MonacoEditor } from '../monaco'
import { CodeEditorUIController } from './code-editor-ui'
import CodeEditorUI from './CodeEditorUI.vue'

const { attachUI, detachUI, monaco } = vi.hoisted(() => ({
  attachUI: vi.fn(),
  detachUI: vi.fn(),
  monaco: { editor: { EditorOption: { fontSize: 1 } } }
}))
vi.mock('../context', () => ({ useCodeEditor: () => ({ monaco, attachUI, detachUI }) }))
vi.mock('@/utils/user-storage', () => ({ useUserLocalStorage: (_key: string, initial: unknown) => ref(initial) }))
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useModal: () => vi.fn(),
  providePopupContainer: vi.fn()
}))
vi.mock('@/utils/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  untilTaskScheduled: () => Promise.resolve()
}))

afterEach(() => vi.restoreAllMocks())

describe('Code Editor UI options', () => {
  it('updates read-only state and localized feedback without replacing the editor or controller', async () => {
    const i18n = createI18n({ lang: 'zh' })
    const editor = {
      updateOptions: vi.fn(),
      onDidChangeConfiguration: vi.fn()
    }
    vi.spyOn(CodeEditorUIController.prototype, 'init').mockImplementation(function (this: CodeEditorUIController) {
      Object.defineProperty(this, 'editor', { get: () => editor })
    })
    const dispose = vi.spyOn(CodeEditorUIController.prototype, 'dispose').mockImplementation(() => {})
    const wrapper = shallowMount(CodeEditorUI, {
      props: { codeFilePath: 'Cat.spx', simpleMode: true },
      global: { plugins: [i18n], directives: { radar: {} } }
    })
    expect(wrapper.getComponent({ name: 'MonacoEditorComp' }).props('options').readOnlyMessage).toEqual({
      value: '无法在只读编辑器中编辑'
    })
    await wrapper.setProps({
      readOnlyMessage: {
        en: 'Stop the run before editing code',
        zh: '请先停止运行，再修改代码'
      }
    })
    wrapper.getComponent({ name: 'MonacoEditorComp' }).vm.$emit('init', editor as unknown as MonacoEditor)
    await flushPromises()
    const ui = attachUI.mock.calls.at(-1)![0] as CodeEditorUIController
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: false }))
    await wrapper.setProps({ readOnly: true })
    expect(ui.readOnly).toBe(true)
    expect(editor.updateOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnly: true, readOnlyMessage: { value: '请先停止运行，再修改代码' } })
    )
    i18n.setLang('en')
    await nextTick()
    expect(editor.updateOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        readOnly: true,
        readOnlyMessage: { value: 'Stop the run before editing code' }
      })
    )
    i18n.setLang('zh')
    await nextTick()
    expect(editor.updateOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnly: true, readOnlyMessage: { value: '请先停止运行，再修改代码' } })
    )
    expect(wrapper.getComponent({ name: 'APIReferenceUI' }).props('disabled')).toBe(true)
    expect(wrapper.findComponent({ name: 'CompletionUI' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'InputHelperUI' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ContextMenuUI' }).exists()).toBe(false)
    await wrapper.setProps({ readOnly: false })
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: false }))
    expect(ui.readOnly).toBe(false)
    expect(wrapper.getComponent({ name: 'APIReferenceUI' }).props('disabled')).toBe(false)
    expect(wrapper.findComponent({ name: 'CompletionUI' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'InputHelperUI' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ContextMenuUI' }).exists()).toBe(true)
    expect(dispose).not.toHaveBeenCalled()
    expect(attachUI.mock.calls.at(-1)![0]).toBe(ui)
    wrapper.unmount()
  })

  it('wraps code in Simple Mode, and applies the Normal mode word wrap setting to the editor', async () => {
    const editor = {
      updateOptions: vi.fn(),
      onDidChangeConfiguration: vi.fn()
    }
    vi.spyOn(CodeEditorUIController.prototype, 'init').mockImplementation(function (this: CodeEditorUIController) {
      Object.defineProperty(this, 'editor', { get: () => editor })
    })
    vi.spyOn(CodeEditorUIController.prototype, 'dispose').mockImplementation(() => {})
    const global = { plugins: [createI18n({ lang: 'en' })], directives: { radar: {} } }

    const simple = shallowMount(CodeEditorUI, { props: { codeFilePath: 'Cat.spx', simpleMode: true }, global })
    expect(simple.getComponent({ name: 'MonacoEditorComp' }).props('options').wordWrap).toBe('on')
    expect(simple.findComponent({ name: 'CodeEditorSettings' }).exists()).toBe(false)
    simple.unmount()

    const normal = shallowMount(CodeEditorUI, { props: { codeFilePath: 'Cat.spx' }, global })
    expect(normal.getComponent({ name: 'MonacoEditorComp' }).props('options').wordWrap).toBe('off')
    normal.getComponent({ name: 'MonacoEditorComp' }).vm.$emit('init', editor as unknown as MonacoEditor)
    await flushPromises()
    normal.getComponent({ name: 'CodeEditorSettings' }).vm.$emit('update:wordWrap', true)
    await nextTick()
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ wordWrap: 'on' }))
    normal.unmount()
  })
})

describe('API Reference layout', () => {
  it.each([false, true])(
    'hides only completed empty results and restores the sidebar (simpleMode=%s)',
    async (simpleMode) => {
      const items = shallowRef<APIReferenceItem[] | null>(null)
      const error = shallowRef<unknown>(null)
      vi.spyOn(APIReferenceController.prototype, 'items', 'get').mockImplementation(() => items.value)
      vi.spyOn(APIReferenceController.prototype, 'error', 'get').mockImplementation(() => error.value)
      const wrapper = shallowMount(CodeEditorUI, {
        props: { codeFilePath: 'Cat.spx', simpleMode },
        global: { plugins: [createI18n({ lang: 'en' })], directives: { radar: {} } }
      })
      const sidebar = () => wrapper.find('aside[style]')
      const handle = () => wrapper.find('.cursor-col-resize')
      expect(sidebar().exists()).toBe(true)
      expect(handle().exists()).toBe(true)
      const width = sidebar().attributes('style')

      items.value = []
      await nextTick()
      expect(sidebar().exists()).toBe(false)
      expect(handle().exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'APIReferenceUI' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'MonacoEditorComp' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'CodeEditorSettings' }).exists()).toBe(!simpleMode)

      items.value = [{ definition: { package: 'spx', name: 'say' } } as APIReferenceItem]
      await nextTick()
      expect(sidebar().attributes('style')).toBe(width)
      expect(handle().exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'APIReferenceUI' }).exists()).toBe(true)

      items.value = null
      await nextTick()
      expect(sidebar().exists()).toBe(true)
      error.value = new Error('API loading failed')
      await nextTick()
      expect(sidebar().exists()).toBe(true)

      error.value = null
      items.value = []
      await nextTick()
      expect(sidebar().exists()).toBe(false)

      await wrapper.setProps({ apiReferenceEnabled: false })
      items.value = [{ definition: { package: 'spx', name: 'say' } } as APIReferenceItem]
      await nextTick()
      expect(sidebar().exists()).toBe(false)
      expect(handle().exists()).toBe(false)
      wrapper.unmount()
    }
  )
})
