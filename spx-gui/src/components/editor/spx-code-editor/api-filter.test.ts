import { describe, expect, it, vi } from 'vitest'

import {
  getTextDocumentId,
  parseDefinitionId,
  type CompletionList,
  type DefinitionDocumentationItem,
  type IDocumentBase,
  type ICompletionProvider
} from '@/components/xgo-code-editor'
import { FilteredCompletionProvider, matchesAPI } from './api-filter'
import { SpxAPIReferenceProvider } from './api-reference'

const stepTo = parseDefinitionId('xgo:github.com/goplus/spx/v3?Sprite.stepTo#0')
const turn = parseDefinitionId('xgo:github.com/goplus/spx/v3?Sprite.turn#0')

describe('API whitelist', () => {
  it('matches all overloads when no overload is specified', () => {
    expect(matchesAPI(stepTo, [parseDefinitionId('xgo:github.com/goplus/spx/v3?Sprite.stepTo')])).toBe(true)
    expect(matchesAPI(turn, [parseDefinitionId('xgo:github.com/goplus/spx/v3?Sprite.stepTo')])).toBe(false)
  })

  it('filters SPX API reference items', async () => {
    const items = new Map(
      [stepTo, turn].map((definition) => [
        `xgo:${definition.package}?${definition.name}#${definition.overloadId}`,
        { definition } as DefinitionDocumentationItem
      ])
    )
    const documentBase = {
      getDocumentation: vi.fn(async (id: string) => items.get(id) ?? null)
    } as unknown as IDocumentBase
    const ctx = { textDocument: { id: getTextDocumentId('Lita.spx') }, signal: new AbortController().signal } as never

    const provider = new SpxAPIReferenceProvider(documentBase, [stepTo])
    expect((await provider.provideAPIReference(ctx)).map((item) => item.definition)).toEqual([stepTo])
    expect(await new SpxAPIReferenceProvider(documentBase, []).provideAPIReference(ctx)).toEqual([])
  })

  it('filters completion APIs but keeps items without a definition', async () => {
    const result = {
      items: [{ definition: stepTo }, { definition: turn }, { definition: null }],
      isIncomplete: false
    } as CompletionList
    const provider: ICompletionProvider = { provideCompletion: vi.fn().mockResolvedValue(result) }
    const filtered = new FilteredCompletionProvider(provider, [stepTo])

    expect((await filtered.provideCompletion({} as never, { line: 1, column: 1 })).items).toEqual([
      result.items[0],
      result.items[2]
    ])
  })
})
