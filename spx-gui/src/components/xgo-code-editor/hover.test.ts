import { describe, expect, it, vi } from 'vitest'
import type { IDocumentBase } from './document-base'
import type { ILSPClient } from './lsp/types'
import type { ITextDocument } from './common'
import { HoverProvider } from './hover'
import { builtInCommandGoToDefinition, builtInCommandViewDefinition } from './ui/code-editor-ui'

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
  it('offers view and go-to actions for a definition in another document', async () => {
    const sourceUri = 'file:///source.spx'
    const targetUri = 'file:///target.spx'
    const provider = new HoverProvider(makeLSPClient(targetUri), documentBase)

    const hover = await provider.provideHover(
      { textDocument: makeTextDocument(sourceUri), signal: new AbortController().signal },
      { line: 5, column: 2 }
    )

    expect(hover?.actions.map((action) => action.command)).toEqual([
      builtInCommandViewDefinition,
      builtInCommandGoToDefinition
    ])
    expect(hover?.actions[0].arguments).toEqual([
      {
        textDocument: { uri: targetUri },
        range: {
          start: { line: 5, column: 1 },
          end: { line: 5, column: 9 }
        }
      }
    ])
    expect(hover?.actions[1].arguments).toEqual([
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

  it('does not offer definition actions for the current location', async () => {
    const sourceUri = 'file:///source.spx'
    const provider = new HoverProvider(makeLSPClient(sourceUri), documentBase)

    const hover = await provider.provideHover(
      { textDocument: makeTextDocument(sourceUri), signal: new AbortController().signal },
      { line: 5, column: 2 }
    )

    expect(hover?.actions).toEqual([])
  })
})
