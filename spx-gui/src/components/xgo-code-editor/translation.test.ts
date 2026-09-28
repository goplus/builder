import { describe, expect, it } from 'vitest'
import { extractDocumentationExplanation, mockEditorTranslationProvider } from './translation'

describe('editor translation demo adapter', () => {
  it('keeps the definition signature out of the translated explanation', () => {
    expect(extractDocumentationExplanation('func println(a ...any) (n int, err error)\n\nPrintln writes output.')).toBe(
      'Println writes output.'
    )
    expect(extractDocumentationExplanation('```go\ntype string\n```\n\nA string is immutable.')).toBe(
      'A string is immutable.'
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
})
