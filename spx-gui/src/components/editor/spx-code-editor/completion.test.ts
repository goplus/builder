import { describe, expect, it, vi } from 'vitest'
import { packageSpx } from '@/utils/spx'
import {
  CompletionItemKind,
  DocumentBase,
  InsertTextFormat,
  getTextDocumentId,
  type CompletionContext,
  type CompletionItem,
  type DefinitionIdentifier
} from '@/components/xgo-code-editor'
import { hide } from './document-base'
import { FilteredCompletionProvider } from './api-filter'
import { SpxCompletionProvider } from './completion'

function item(label: string, definition: DefinitionIdentifier | null = null): CompletionItem {
  return {
    label,
    definition,
    kind: CompletionItemKind.Function,
    filterSortText: label,
    insertText: label,
    insertTextFormat: InsertTextFormat.PlainText,
    textEdit: null,
    documentation: null
  }
}

describe('SPX completion policy', () => {
  it('keeps documented SPX APIs, kwargs, and non-SPX completions, and composes with the API whitelist', async () => {
    const undocumented = { package: packageSpx, name: 'Sprite.internal' }
    const items = [
      item('hide', hide.definition),
      item('internal', undocumented),
      item('external', { package: 'example.com/library', name: 'external' }),
      item('score', { package: 'main', name: 'score' }),
      item('for'),
      { ...item('message', undocumented), insertTextFormat: InsertTextFormat.Snippet, insertText: 'message = ${1:}' }
    ]
    const provider = new SpxCompletionProvider(
      { provideCompletion: vi.fn().mockResolvedValue({ items, isIncomplete: true }) },
      new DocumentBase([hide])
    )
    const ctx = {
      textDocument: { id: getTextDocumentId('Cat.spx') },
      signal: new AbortController().signal
    } as CompletionContext
    const position = { line: 1, column: 1 }
    const result = await provider.provideCompletion(ctx, position)
    expect(result.items.map((item) => item.label)).toEqual(['hide', 'external', 'score', 'for', 'message'])
    expect(result.isIncomplete).toBe(true)
    const filtered = new FilteredCompletionProvider(provider, [hide.definition])
    expect((await filtered.provideCompletion(ctx, position)).items.map((item) => item.label)).toEqual([
      'hide',
      'score',
      'for'
    ])
  })
})
