import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
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
vi.mock('@/utils/user-storage', () => ({ userLocalStorageRef: (_key: string, initial: unknown) => ref(initial) }))
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
})
