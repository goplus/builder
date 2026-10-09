import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { MonacoEditor } from '../monaco'
import { CodeEditorUIController } from './code-editor-ui'
import CodeEditorUI from './CodeEditorUI.vue'

const { attachUI, detachUI, monaco } = vi.hoisted(() => ({
  attachUI: vi.fn(),
  detachUI: vi.fn(),
  monaco: { editor: { EditorOption: { fontSize: 1 } } }
}))
vi.mock('../context', () => ({ useCodeEditor: () => ({ monaco, attachUI, detachUI }) }))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (msg: { en: string }) => msg.en }) }))
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
  it('toggles Monaco read-only without replacing the editor or controller', async () => {
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
      global: { directives: { radar: {} } }
    })
    wrapper.getComponent({ name: 'MonacoEditorComp' }).vm.$emit('init', editor as unknown as MonacoEditor)
    await flushPromises()
    const ui = attachUI.mock.calls.at(-1)![0] as CodeEditorUIController
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: false }))
    await wrapper.setProps({ readOnly: true })
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: true }))
    expect(ui.readOnly).toBe(true)
    await wrapper.setProps({ readOnly: false })
    expect(editor.updateOptions).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: false }))
    expect(ui.readOnly).toBe(false)
    expect(dispose).not.toHaveBeenCalled()
    expect(attachUI.mock.calls.at(-1)![0]).toBe(ui)
    wrapper.unmount()
  })
})
