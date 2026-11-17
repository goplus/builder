import { describe, expect, it, vi } from 'vitest'

import {
  getTextDocumentId,
  parseDefinitionId,
  DocumentBase,
  type CompletionList,
  type DefinitionDocumentationItem,
  type ICompletionProvider
} from '@/components/xgo-code-editor'
import { FilteredCompletionProvider, matchesAPI } from './api-filter'
import { SpxAPIReferenceProvider } from './api-reference'

const stepTo = parseDefinitionId('xgo:github.com/goplus/spx/v4?Sprite.stepTo#0')
const turn = parseDefinitionId('xgo:github.com/goplus/spx/v4?Sprite.turn#0')

describe('API whitelist', () => {
  it('matches all overloads when no overload is specified', () => {
    expect(matchesAPI(stepTo, [parseDefinitionId('xgo:github.com/goplus/spx/v4?Sprite.stepTo')])).toBe(true)
    expect(matchesAPI(turn, [parseDefinitionId('xgo:github.com/goplus/spx/v4?Sprite.stepTo')])).toBe(false)
  })

  it('filters SPX API reference items', async () => {
    const documentBase = new DocumentBase(
      [stepTo, turn].map((definition) => ({ definition }) as DefinitionDocumentationItem)
    )
    const ctx = { textDocument: { id: getTextDocumentId('Lita.spx') }, signal: new AbortController().signal } as never

    const provider = new SpxAPIReferenceProvider(documentBase, [stepTo])
    expect((await provider.provideAPIReference(ctx)).map((item) => item.definition)).toEqual([stepTo])
    expect(await new SpxAPIReferenceProvider(documentBase, []).provideAPIReference(ctx)).toEqual([])
  })

  it('filters completion APIs but keeps project definitions and items without a definition', async () => {
    const sprite = parseDefinitionId('xgo:main?MySprite')
    const variable = parseDefinitionId('xgo:main?score')
    const result = {
      items: [
        { definition: stepTo },
        { definition: turn },
        { definition: sprite },
        { definition: variable },
        { definition: null }
      ],
      isIncomplete: false
    } as CompletionList
    const provider: ICompletionProvider = { provideCompletion: vi.fn().mockResolvedValue(result) }
    const filtered = new FilteredCompletionProvider(provider, [stepTo])

    expect((await filtered.provideCompletion({} as never, { line: 1, column: 1 })).items).toEqual([
      result.items[0],
      result.items[2],
      result.items[3],
      result.items[4]
    ])
  })
})
