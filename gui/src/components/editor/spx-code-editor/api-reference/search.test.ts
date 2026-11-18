import { describe, expect, it, vi } from 'vitest'
import { createAPIReferenceSearch } from '@/apis/api-reference'
import type { APIReferenceItem } from '@/components/xgo-code-editor/api-reference'
import { stringifyDefinitionId } from '@/components/xgo-code-editor/definition-id'
import { searchAPIReferences } from './search'

vi.mock('@/apis/api-reference', () => ({ createAPIReferenceSearch: vi.fn() }))

function candidates(): APIReferenceItem[] {
  return ['animate', 'animateAndWait', 'play', 'wait'].map(
    (name) =>
      ({
        definition: { package: 'spx', name: `Sprite.${name}` },
        overview: `${name} name`,
        detail: { value: { en: name, zh: name } }
      }) as APIReferenceItem
  )
}

describe('SPX API Reference search', () => {
  it('retains related animation variants while excluding distant semantic results', async () => {
    const items = candidates()
    const signal = new AbortController().signal
    vi.mocked(createAPIReferenceSearch).mockResolvedValue({
      results: items.map((item, i) => ({
        id: stringifyDefinitionId(item.definition),
        score: [0.82, 0.8, 0.67, 0.4][i]
      }))
    })
    expect(await searchAPIReferences(items, '播放动画', signal)).toEqual(items.slice(0, 2))
    expect(createAPIReferenceSearch).toHaveBeenLastCalledWith(
      {
        query: '播放动画',
        candidates: expect.arrayContaining([expect.objectContaining({ id: 'xgo:spx?Sprite.animate' })])
      },
      signal
    )
  })

  it('allows no match and keeps direct names even below the semantic threshold', async () => {
    const items = candidates()
    vi.mocked(createAPIReferenceSearch).mockResolvedValue({
      results: items.map((item) => ({ id: stringifyDefinitionId(item.definition), score: 0.5 }))
    })
    expect(await searchAPIReferences(items, '明天的天气', new AbortController().signal)).toEqual([])
    expect(await searchAPIReferences(items, 'animate', new AbortController().signal)).toEqual(items.slice(0, 2))
  })
})
