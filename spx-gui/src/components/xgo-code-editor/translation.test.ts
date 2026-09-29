import { describe, expect, it } from 'vitest'
import {
  extractDocumentationExplanation,
  formatDocumentationTranslation,
  mockEditorTranslationProvider
} from './translation'

describe('editor translation demo adapter', () => {
  it('keeps the definition signature out of the translated explanation', () => {
    expect(extractDocumentationExplanation('func println(a ...any) (n int, err error)\n\nPrintln writes output.')).toBe(
      'Println writes output.'
    )
    expect(extractDocumentationExplanation('```go\ntype string\n```\n\nA string is immutable.')).toBe(
      'A string is immutable.'
    )
    expect(
      extractDocumentationExplanation(
        'func think(msg string)\n\nThink sends a message.\n\nfunc think(msg string, context map[string]any)'
      )
    ).toBe('Think sends a message.')
    expect(extractDocumentationExplanation('type Player\n\nPlayer represents an AI agent.')).toBe(
      'Player represents an AI agent.'
    )
    expect(
      extractDocumentationExplanation(
        '<pre is="definition-item" def-id="xgo:ai?think" overview="func think(msg string)">\nThink sends a message.\n</pre>'
      )
    ).toBe('Think sends a message.')
  })

  it('keeps the definition structure and places the demo label inline with its body', () => {
    const markdown =
      '<pre is="definition-item" def-id="xgo:ai?think" overview="func think(msg string)">\nThink sends a message.\n</pre>'
    expect(formatDocumentationTranslation(markdown, '【模拟翻译】Think sends a message.')).toBe(
      '<pre is="definition-item" def-id="xgo:ai?think" overview="func think(msg string)">【模拟翻译】Think sends a message.</pre>'
    )
  })

  it('uses the demo translation for the supported diagnostic', async () => {
    await expect(
      mockEditorTranslationProvider.translate({
        kind: 'diagnostic',
        locale: 'zh',
        source: 'cannot use v.IsMature (type func() bool) as type bool in autoclosure'
      })
    ).resolves.toContain('无法将 v.IsMature')
  })

  it('does not translate English editor content', async () => {
    await expect(
      mockEditorTranslationProvider.translate({ kind: 'documentation', locale: 'en', source: 'A string.' })
    ).resolves.toBe('A string.')
  })

  it('marks unsupported content as a simulation instead of pretending it is translated', async () => {
    await expect(
      mockEditorTranslationProvider.translate({ kind: 'documentation', locale: 'zh', source: 'An unknown sentence.' })
    ).resolves.toBe('【模拟翻译】An unknown sentence.')
  })
})
