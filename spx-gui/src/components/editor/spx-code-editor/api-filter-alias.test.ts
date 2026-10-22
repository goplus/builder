import { describe, expect, it, vi } from 'vitest'
import { packageSpx } from '@/utils/spx'
import {
  DocumentBase,
  getTextDocumentId,
  type APIReferenceContext,
  type CompletionList,
  type DefinitionDocumentationItem,
  type IXGoProject
} from '@/components/xgo-code-editor'
import { spxClassFramework } from './spx-project'
import { resolveDefinitionId } from './definition-id'
import { SpxAPIReferenceProvider } from './api-reference'
import { FilteredCompletionProvider } from './api-filter'

vi.mock('@/utils/spx', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/spx')>()),
  packageSpx: 'example.com/spx/v99'
}))

describe('API filtering after an SPX package path change', () => {
  it.each([
    ['xgo:spx?Sprite.stepTo', ['0', '3']],
    ['xgo:spx?Sprite.stepTo#3', ['3']],
    ['xgo:github.com/goplus/spx/v3?Sprite.stepTo', []],
    ['xgo:spxx?Sprite.stepTo', []]
  ])('uses the same resolved whitelist in references and completion: %s', async (id, overloads) => {
    const project: IXGoProject = {
      classFramework: spxClassFramework,
      getCodeFiles: () => [],
      getCodeOwner: () => null,
      exportFiles: () => ({})
    }
    const definitions = [
      { package: packageSpx, name: 'Sprite.stepTo', overloadId: '0' },
      { package: packageSpx, name: 'Sprite.stepTo', overloadId: '3' },
      { package: packageSpx, name: 'Sprite.turn', overloadId: '0' }
    ]
    const whitelist = [resolveDefinitionId(id, project)]
    const documentBase = new DocumentBase(
      definitions.map((definition) => ({ definition }) as DefinitionDocumentationItem)
    )
    const references = new SpxAPIReferenceProvider(documentBase, whitelist)
    const ctx = {
      textDocument: { id: getTextDocumentId('Lita.spx') },
      signal: new AbortController().signal
    } as APIReferenceContext
    const completion = new FilteredCompletionProvider(
      {
        provideCompletion: async () =>
          ({ items: definitions.map((definition) => ({ definition })), isIncomplete: false }) as CompletionList
      },
      whitelist
    )
    const expected = definitions.filter(
      (definition) => definition.name === 'Sprite.stepTo' && overloads.includes(definition.overloadId)
    )
    expect((await references.provideAPIReference(ctx)).map((item) => item.definition)).toEqual(expected)
    expect(
      (await completion.provideCompletion(ctx, { line: 1, column: 1 })).items.map((item) => item.definition)
    ).toEqual(expected)
  })
})
