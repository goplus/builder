import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { I18n } from '@/utils/i18n'
import type { CodeEditor } from '../code-editor'
import { CodeEditorUIController } from './code-editor-ui'

function makeUI() {
  const readOnly = ref(false)
  const ui = new CodeEditorUIController({ uri: 'file:///Cat.spx' }, {} as CodeEditor, {} as I18n, {
    renameHandler: vi.fn(),
    get readOnly() {
      return readOnly.value
    }
  })
  const document = { pushEdits: vi.fn(), getLineContent: () => '', getWordAtPosition: () => null }
  const editor = { setPosition: vi.fn(), focus: vi.fn(), executeEdits: vi.fn(), getContribution: vi.fn() }
  Object.defineProperty(ui, 'activeTextDocument', { get: () => document })
  Object.defineProperty(ui, 'editor', { get: () => editor })
  return { ui, document, editor, setReadOnly: (value: boolean) => (readOnly.value = value) }
}

describe('Code Editor UI read-only state', () => {
  it('blocks API, stage-name, and dropped text insertion while retaining the document', async () => {
    const { ui, document, setReadOnly } = makeUI()
    await ui.insertText('before')
    expect(document.pushEdits).toHaveBeenCalledTimes(1)
    setReadOnly(true)
    await ui.insertText('drop')
    await ui.insertInlineText('Cat')
    await ui.insertBlockText('say "hello"')
    expect(document.pushEdits).toHaveBeenCalledTimes(1)
    expect(ui.activeTextDocument).toBe(document)
    setReadOnly(false)
    await ui.insertInlineText('Cat')
    expect(document.pushEdits).toHaveBeenCalledTimes(2)
  })

  it('blocks snippets and input helpers during a run', async () => {
    const { ui, editor, setReadOnly } = makeUI()
    const slot = { id: 'slot' }
    Object.defineProperty(ui.inputHelperController, 'slots', { get: () => [slot] })
    setReadOnly(true)
    await ui.insertSnippet('say ${1:msg}')
    ui.inputHelperController.startInputing('slot')
    expect(editor.executeEdits).not.toHaveBeenCalled()
    expect(editor.getContribution).not.toHaveBeenCalled()
    expect(ui.inputHelperController.inputingSlot).toBeNull()
    setReadOnly(false)
    ui.inputHelperController.startInputing('slot')
    expect(ui.inputHelperController.inputingSlot).toBe(slot)
  })

  it('closes an open input helper synchronously when editing becomes read-only', () => {
    vi.useFakeTimers()
    const { ui, editor, setReadOnly } = makeUI()
    Object.assign(ui.codeEditor, { project: { exportFiles: () => ({}) }, inputHelperProvider: null })
    Object.assign(editor, {
      getDomNode: () => document.createElement('div'),
      onKeyDown: () => ({ dispose: vi.fn() }),
      onMouseDown: () => ({ dispose: vi.fn() })
    })
    const slot = { id: 'slot' }
    Object.defineProperty(ui.inputHelperController, 'slots', { get: () => [slot] })
    const controller = ui.inputHelperController
    try {
      controller.init()
      controller.startInputing('slot')
      expect(controller.inputingSlot).toBe(slot)
      setReadOnly(true)
      expect(controller.inputingSlot).toBeNull()
      controller.startInputing('slot')
      expect(controller.inputingSlot).toBeNull()
      setReadOnly(false)
      controller.startInputing('slot')
      expect(controller.inputingSlot).toBe(slot)
    } finally {
      controller.dispose()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
