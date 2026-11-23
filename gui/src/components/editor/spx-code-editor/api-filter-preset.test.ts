import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { packageSpx } from '@/utils/spx'
import { SpxProject } from '@/models/spx/project'
import { History } from '@/components/editor/history'
import { Runtime } from '@/components/editor/runtime'
import {
  CodeEditor,
  DocumentBase,
  getTextDocumentId,
  type APIReferenceContext,
  type CodeEditorParams
} from '@/components/xgo-code-editor'
import { SpxCodeEditorProject } from './spx-project'
import { stepTo0, stepTo1, stepTo2, stepTo3, turn0 } from './document-base'
import CodeEditorInitializer from './CodeEditorInitializer.vue'

const editorContext = vi.hoisted(() => ({ state: null as unknown }))

vi.mock('../EditorContextProvider.vue', () => ({ useEditorCtx: () => editorContext }))
vi.mock('./resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./resource')>()),
  useResourceSelectorHelpers: () => ({}),
  useResourceRenameHelpers: () => ({})
}))
vi.mock('@/utils/spx', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/spx')>()),
  packageSpx: 'example.com/spx/v99'
}))

describe('editor API filter preset resolution', () => {
  it.each([
    { apis: null, overloads: ['0', '2', '3'] },
    { apis: [], overloads: [] },
    { apis: ['xgo:preset/spx?Sprite.stepTo'], overloads: ['0', '2', '3'] },
    { apis: ['xgo:preset/spx?Sprite.stepTo#1'], overloads: [] },
    { apis: ['xgo:preset/spx?Sprite.stepTo#2'], overloads: ['2'] },
    { apis: ['xgo:preset/spx?Sprite.stepTo#3'], overloads: ['3'] },
    { apis: ['xgo:github.com/goplus/spx/v3?Sprite.stepTo'], overloads: [] },
    { apis: ['xgo:spx?Sprite.stepTo'], overloads: [] },
    { apis: ['xgo:preset/unknown?Sprite.stepTo'], overloads: [] },
    { apis: ['xgo:unknown/package?Sprite.stepTo'], overloads: [] },
    { apis: ['xgo:preset/spx?Sprite.unknown'], overloads: [] },
    { apis: ['xgo:preset/unknown?Sprite.stepTo', 'xgo:preset/spx?Sprite.stepTo#3'], overloads: ['3'] }
  ])('applies $apis consistently to references and completion', async ({ apis, overloads }) => {
    const documentations = [stepTo0, stepTo1, stepTo2, stepTo3, turn0]
    const definitions = documentations.filter((item) => !item.hiddenFromList).map((item) => item.definition)
    const defaultDefinitions = [stepTo0, stepTo3, turn0].map((item) => item.definition)
    const project = new SpxProject()
    const history = new History(project)
    const runtime = new Runtime(project)
    editorContext.state = { project, history, runtime }
    const documentBase = new DocumentBase(documentations)
    const codeEditor = new CodeEditor({
      project: new SpxCodeEditorProject(project, history),
      history,
      monaco: {},
      lspClient: {
        dispose() {},
        getCompletionList: async () => ({
          items: documentations.map(({ definition }) => ({
            label: definition.name?.split('.').pop() ?? '',
            data: { definition }
          })),
          isIncomplete: false
        })
      },
      documentBase,
      presetPackages: { spx: packageSpx }
    } as unknown as CodeEditorParams)
    const wrapper = mount(CodeEditorInitializer, { props: { codeEditor, apiWhitelist: apis } })
    try {
      const ctx = {
        textDocument: { id: getTextDocumentId('Lita.spx'), getLineContent: () => '' },
        signal: new AbortController().signal
      } as unknown as APIReferenceContext
      const expected =
        apis == null
          ? definitions
          : definitions.filter(
              (definition) => definition.name === 'Sprite.stepTo' && overloads.includes(definition.overloadId ?? '')
            )
      const referenceDefinitions = async () =>
        (await codeEditor.apiReferenceProvider.provideAPIReference(ctx)).map((item) => item.definition)
      const completionDefinitions = async () =>
        (await codeEditor.completionProvider.provideCompletion(ctx, { line: 1, column: 1 })).items.map(
          (item) => item.definition
        )
      expect(await referenceDefinitions()).toEqual(apis == null ? expect.arrayContaining(defaultDefinitions) : expected)
      expect(await completionDefinitions()).toEqual(expected)

      await wrapper.setProps({ apiWhitelist: ['xgo:preset/unknown?Sprite.stepTo'] })
      expect(await referenceDefinitions()).toEqual([])
      expect(await completionDefinitions()).toEqual([])

      await wrapper.setProps({ apiWhitelist: null })
      expect(await referenceDefinitions()).toEqual(expect.arrayContaining(defaultDefinitions))
      expect(await completionDefinitions()).toEqual(definitions)
    } finally {
      wrapper.unmount()
      codeEditor.dispose()
      runtime.dispose()
      project.dispose()
    }
  })
})
