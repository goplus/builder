import { describe, expect, it } from 'vitest'
import type { APIReferenceItem } from '@/components/xgo-code-editor'
import { getAPIReferenceSearchText, rankAPIReferenceResults } from './search'

function item(name: string, overloadId = '0'): APIReferenceItem {
  return {
    definition: { package: 'spx', name, overloadId },
    overview: `${name} name`,
    detail: { value: { en: 'Play animation', zh: '播放动画' } }
  } as APIReferenceItem
}

describe('API Reference semantic results', () => {
  it('keeps direct names ahead of semantic matches, filters low scores and preserves overloads', () => {
    const items = [item('Sprite.animate'), item('Sprite.animate', '1'), item('Sprite.say'), item('Sprite.play')]
    expect(rankAPIReferenceResults(items, 'animate', [0.2, 0.3, 0.4, 0.9])).toEqual([items[1], items[0], items[3]])
  })

  it('uses static bilingual documentation and retains receiver and signature', () => {
    const value = item('Sprite.animate', '1')
    expect(getAPIReferenceSearchText(value)).toBe(
      'API: Sprite.animate\nSignature: Sprite.animate name\nDescription (en): Play animation\nDescription (zh): 播放动画'
    )
  })

  it('labels a description without locale metadata', () => {
    const value = item('Sprite.animate')
    value.detail = { ...value.detail, value: 'Play animation' }
    expect(getAPIReferenceSearchText(value)).toBe(
      'API: Sprite.animate\nSignature: Sprite.animate name\nDescription: Play animation'
    )
  })
})
