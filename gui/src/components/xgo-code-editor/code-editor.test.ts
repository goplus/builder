import { describe, expect, it } from 'vitest'
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
