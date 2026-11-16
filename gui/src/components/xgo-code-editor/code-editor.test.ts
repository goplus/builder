import * as monaco from 'monaco-editor'
import { computed, ref } from 'vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import Mutex from '@/utils/mutex'
import { parseGoxMod } from '@/utils/xgo/gox-mod'
import { fromText, type Files } from '@/models/common/file'
import { History } from '@/components/editor/history'
import type { ICodeOwner } from './text-document'
import type { CodeAction } from './code-action'
import { CodeEditor, type CodeEditorParams } from './code-editor'

function makeEditor(presetPackages?: CodeEditorParams['presetPackages']) {
  return new CodeEditor({
    project: { classFramework: { pkgPaths: [] } },
    history: {},
    monaco: {},
    lspClient: { dispose() {} },
    presetPackages
  } as unknown as CodeEditorParams)
}

function makeCodeActionEditor() {
  const source = 'var score int\nvar speed int\n'
  const merged = 'var (\n\tscore int\n\tspeed int\n)\n'
  const code = ref(source)
  let exists = true
  const files = computed(() => ({ 'main.spx': fromText('main.spx', code.value) }))
  const owner: ICodeOwner = {
    id: 'stage',
    name: 'Stage',
    getTextDocumentId: () => ({ uri: 'file:///main.spx' }),
    getCode: () => code.value,
    setCode: (value) => {
      code.value = value
    }
  }
  const project = {
    classFramework: parseGoxMod('project main.spx Game github.com/goplus/spx/v4').projects[0],
    getCodeFiles: () => ['main.spx'],
    getCodeOwner: (path: string) => (exists && path === 'main.spx' ? owner : null),
    exportFiles: () => files.value,
    mutex: new Mutex(),
    loadFiles: async (snapshot: Files) => {
      code.value = new TextDecoder().decode(await snapshot['main.spx']!.arrayBuffer())
    }
  }
  const history = new History(project)
  const editor = new CodeEditor({
    project,
    history,
    monaco,
    lspClient: { dispose() {} } as CodeEditorParams['lspClient']
  })
  onTestFinished(() => editor.dispose())
  const action: CodeAction = {
    title: {
      en: 'Merge top-level var declarations',
      zh: '合并顶层 var 声明'
    },
    textDocument: owner.getTextDocumentId(),
    source,
    edits: [
      { range: { start: { line: 1, column: 1 }, end: { line: 2, column: 1 } }, newText: merged },
      { range: { start: { line: 2, column: 1 }, end: { line: 3, column: 1 } }, newText: '' }
    ]
  }
  const document = editor.getTextDocument(action.textDocument)!
  return {
    editor,
    history,
    document,
    action,
    code,
    merged,
    project,
    remove: () => {
      exists = false
    }
  }
}

describe('CodeEditor code actions', () => {
  it('applies all edits to the model and project in one undoable action', async () => {
    const { editor, history, document, action, code, merged } = makeCodeActionEditor()
    await editor.applyCodeAction(action)
    expect(document.getValue()).toBe(merged)
    expect(code.value).toBe(merged)
    expect(history.getUndoAction()?.name).toEqual(action.title)
    await history.undo()
    expect(code.value).toBe(action.source)
    expect(history.getUndoAction()).toBeNull()
    expect(history.getRedoAction()?.name).toEqual(action.title)
    await history.redo()
    expect(code.value).toBe(merged)
    expect(history.getUndoAction()?.name).toEqual(action.title)
  })

  it('rejects stale project source before recording history, even while the editor still shows the old source', async () => {
    const { editor, history, document, action, code } = makeCodeActionEditor()
    code.value = 'println 1\n'
    expect(document.getValue()).toBe(action.source)
    await expect(editor.applyCodeAction(action)).rejects.toThrow('The code has changed')
    expect(code.value).toBe('println 1\n')
    expect(history.getUndoAction()).toBeNull()
  })

  it('rejects a fix whose document has been removed', async () => {
    const { editor, history, action, code, remove } = makeCodeActionEditor()
    remove()
    await expect(editor.applyCodeAction(action)).rejects.toThrow('The code has changed')
    expect(code.value).toBe(action.source)
    expect(history.getUndoAction()).toBeNull()
  })

  it('rechecks source after waiting for another project operation', async () => {
    const { editor, history, project, action, code } = makeCodeActionEditor()
    const unlock = await project.mutex.lock()
    const applying = editor.applyCodeAction(action)
    code.value = 'println 1\n'
    unlock()
    await expect(applying).rejects.toThrow('The code has changed')
    expect(code.value).toBe('println 1\n')
    expect(history.getUndoAction()).toBeNull()
  })
})

describe('CodeEditor definition resolution', () => {
  it("uses each editor instance's preset packages", () => {
    const first = makeEditor({ spx: 'example.com/spx/v3' })
    const second = makeEditor({ spx: 'example.com/spx/v99' })
    try {
      const definition = { package: 'preset/spx', name: 'Sprite.stepTo', overloadId: '3' }
      expect(first.resolveDefinitionId(definition)).toEqual({
        package: 'example.com/spx/v3',
        name: 'Sprite.stepTo',
        overloadId: '3'
      })
      expect(second.resolveDefinitionId(definition)).toEqual({
        package: 'example.com/spx/v99',
        name: 'Sprite.stepTo',
        overloadId: '3'
      })
    } finally {
      first.dispose()
      second.dispose()
    }
  })

  it('supports literal references without preset configuration and returns null for unknown presets', () => {
    const editor = makeEditor()
    try {
      expect(editor.resolveDefinitionId({ package: 'fmt', name: 'Println' })).toEqual({
        package: 'fmt',
        name: 'Println'
      })
      expect(editor.resolveDefinitionId({ package: 'preset/spx', name: 'Sprite.stepTo' })).toBeNull()
    } finally {
      editor.dispose()
    }
  })
})
