import { describe, expect, it, vi } from 'vitest'
import type { IDocumentBase } from './document-base'
import type { ILSPClient } from './lsp/types'
import type { ITextDocument } from './common'
import { HoverProvider } from './hover'
import { builtInCommandViewReferences, builtInCommandViewDefinition } from './ui/code-editor-ui'

function makeLSPClient(targetUri: string) {
  return {
    textDocumentHover: vi.fn().mockResolvedValue({
      contents: { kind: 'markdown', value: 'Variable documentation' },
      range: {
        start: { line: 4, character: 0 },
        end: { line: 4, character: 8 }
      }
    }),
    getDefinition: vi.fn().mockResolvedValue(null),
    textDocumentDefinition: vi.fn().mockResolvedValue({
      uri: targetUri,
      range: {
        start: { line: 4, character: 0 },
        end: { line: 4, character: 8 }
      }
    }),
    textDocumentTypeDefinition: vi.fn().mockResolvedValue(null),
    textDocumentPrepareRename: vi.fn().mockResolvedValue(null)
  } as unknown as ILSPClient
}

const documentBase = {
  getDocumentation: vi.fn().mockResolvedValue(null)
} as unknown as IDocumentBase

function makeTextDocument(uri: string) {
  return { id: { uri } } as unknown as ITextDocument
}

describe('HoverProvider definition actions', () => {
  it('offers only view definition for a call in another document', async () => {
    const sourceUri = 'file:///source.spx'
    const targetUri = 'file:///target.spx'
    const provider = new HoverProvider(makeLSPClient(targetUri), documentBase)

    const hover = await provider.provideHover(
      { textDocument: makeTextDocument(sourceUri), signal: new AbortController().signal },
      { line: 5, column: 2 }
    )

    expect(hover?.actions.map((action) => action.command)).toEqual([builtInCommandViewDefinition])
    expect(hover?.actions[0].arguments).toEqual([
      {
        textDocument: { uri: targetUri },
        range: {
          start: { line: 5, column: 1 },
          end: { line: 5, column: 9 }
        }
      },
      {
        textDocument: { uri: sourceUri },
        position: { line: 5, column: 2 }
      }
    ])
  })

  it('offers view references at the declaration itself', async () => {
    const sourceUri = 'file:///source.spx'
    const provider = new HoverProvider(makeLSPClient(sourceUri), documentBase)

    const hover = await provider.provideHover(
      { textDocument: makeTextDocument(sourceUri), signal: new AbortController().signal },
      { line: 5, column: 2 }
    )

    expect(hover?.actions.map((action) => action.command)).toEqual([builtInCommandViewReferences])
  })

  it('offers view definition for a recursive call in the same document', async () => {
    const uri = 'file:///main.spx'
    const client = makeLSPClient(uri)
    vi.mocked(client.textDocumentDefinition).mockResolvedValue({
      uri,
      range: { start: { line: 1, character: 5 }, end: { line: 1, character: 13 } }
    })
    const provider = new HoverProvider(client, documentBase)
    const hover = await provider.provideHover(
      { textDocument: makeTextDocument(uri), signal: new AbortController().signal },
      { line: 5, column: 2 }
    )
    expect(hover?.actions.map((action) => action.command)).toEqual([builtInCommandViewDefinition])
  })
})
