import { describe, expect, it } from 'vitest'
import {
  animate0,
  animate1,
  animateAndWait,
  stopAnimation,
  gamePlay0,
  costumeName,
  setCostume,
  clone0,
  onCloned1,
  touching0,
  touching2,
  onTouchStart1,
  onTouchStart3,
  step0,
  step1,
  stepTo0,
  stepTo3,
  stepTo4,
  stepTo7,
  glide0,
  glide2,
  glide4
} from '@/components/editor/spx-code-editor/document-base'
import type { APIReferenceItem } from '../../api-reference'
import { forIterate } from '../../document-base/xgo'
import { searchAPIReferenceItems } from './search'

function createItem(name: string, fields: Partial<APIReferenceItem> = {}): APIReferenceItem {
  return {
    ...forIterate,
    definition: { name },
    insertSnippet: name,
    overview: name,
    detail: { value: '' },
    searchKeywords: [],
    ...fields
  }
}

describe('searchAPIReferenceItems', () => {
  it.each(['服装', '衣服', '装扮', 'clothes', 'clothing', 'outfit'])(
    'finds costume APIs by the synonym %s',
    (query) => {
      expect(searchAPIReferenceItems([animate0, costumeName, setCostume, gamePlay0], query)).toEqual([
        costumeName,
        setCostume
      ])
    }
  )

  it.each(['换装', '换服装', '更换服装', '换衣服'])(
    'distinguishes changing a costume from querying its name with %s',
    (query) => {
      expect(searchAPIReferenceItems([costumeName, setCostume], query)).toEqual([setCostume])
    }
  )

  it.each(['change clothes', 'change costume'])('finds either costume term in %s', (query) => {
    expect(searchAPIReferenceItems([costumeName, setCostume], query)).toEqual([setCostume, costumeName])
  })

  it.each(['克隆', 'duplicate'])('finds both cloning and the cloned event with %s', (query) => {
    expect(searchAPIReferenceItems([animate0, clone0, onCloned1], query)).toEqual([clone0, onCloned1])
  })

  it.each(['碰撞', '碰到', 'collision'])('finds collision sensing and events with %s', (query) => {
    expect(searchAPIReferenceItems([gamePlay0, touching0, touching2, onTouchStart1, onTouchStart3], query)).toEqual([
      touching0,
      touching2,
      onTouchStart1,
      onTouchStart3
    ])
  })

  it.each(['移动', 'move'])('finds all listed stepping and gliding overloads with %s', (query) => {
    const motionItems = [step0, step1, stepTo0, stepTo3, stepTo4, stepTo7, glide0, glide2, glide4]
    expect(searchAPIReferenceItems([animate0, ...motionItems, gamePlay0], query)).toEqual(motionItems)
  })

  it.each(['animate', 'ANIMATE', 'Sprite.animate', '播放动画'])(
    'finds all three playback variants with %s, without sound playback or stopping animation',
    (query) => {
      const items = [gamePlay0, animate0, animate1, animateAndWait, stopAnimation]
      expect(searchAPIReferenceItems(items, query)).toEqual([animate0, animate1, animateAndWait])
    }
  )

  it.each(['play animation', '  PLAY   ANIMATION  '])(
    'ranks exact playback phrases before descriptions and loose matches in %s',
    (query) => {
      const items = [gamePlay0, animate0, animate1, animateAndWait, stopAnimation]
      expect(searchAPIReferenceItems(items, query)).toEqual([
        animate1,
        animate0,
        animateAndWait,
        gamePlay0,
        stopAnimation
      ])
    }
  )

  it('ranks entries matching both Chinese terms before entries matching either term', () => {
    expect(
      searchAPIReferenceItems([gamePlay0, animate0, animate1, animateAndWait, stopAnimation], '播放 动画')
    ).toEqual([animate0, animate1, animateAndWait, gamePlay0, stopAnimation])
  })

  it.each(['数组', '遍历数组', '遍历 数组', 'array', 'iterate array', 'for_iterate'])(
    'finds list iteration by concept or syntax name with %s',
    (query) => {
      expect(searchAPIReferenceItems([animate0, forIterate], query)).toEqual([forIterate])
    }
  )

  it('searches plain string documentation as well as localized documentation', () => {
    const item = { ...forIterate, detail: { value: 'Walk through a collection' } }
    expect(searchAPIReferenceItems([item], 'collection')).toEqual([item])
  })

  it('returns only items in the provided scope', () => {
    expect(searchAPIReferenceItems([gamePlay0, forIterate], 'play animation')).toEqual([gamePlay0])
  })

  it('keeps matching APIs when extra words do not match', () => {
    expect(searchAPIReferenceItems([animate0, gamePlay0, forIterate], 'play nonexistent')).toEqual([
      animate0,
      gamePlay0
    ])
  })

  it.each(['数组 服装', 'ARRAY clothes'])('finds different functions from either term in %s', (query) => {
    expect(searchAPIReferenceItems([forIterate, costumeName, setCostume, animate0], query)).toEqual([
      forIterate,
      costumeName,
      setCostume
    ])
  })

  it('returns no results when none of the search words match', () => {
    expect(searchAPIReferenceItems([animate0, gamePlay0], 'nonexistent 不存在')).toEqual([])
  })

  it.each(['animate', '  SPRITE.ANIMATE  '])('ranks the complete API name before a partial name for %s', (query) => {
    const partial = createItem('Sprite.animateAndWait')
    const exact = createItem('Sprite.animate')
    expect(searchAPIReferenceItems([partial, exact], query)).toEqual([exact, partial])
  })

  it('ranks a normalized exact alias above a phrase in documentation and partial words', () => {
    const partial = createItem('Sprite.animation')
    const description = createItem('Sprite.play', { detail: { value: 'Play\n animation with a given name' } })
    const exact = createItem('Sprite.animate', { searchKeywords: ['  PLAY\tANIMATION  '] })
    expect(searchAPIReferenceItems([partial, description, exact], ' play  animation ')).toEqual([
      exact,
      description,
      partial
    ])
  })

  it.each([
    ['play', 'playback'],
    ['播放', '播放动画']
  ])('ranks the complete functional term %s above the partial alias %s', (query, alias) => {
    const partial = createItem('partial', { searchKeywords: [alias] })
    const exact = createItem('exact', { searchKeywords: [query] })
    expect(searchAPIReferenceItems([partial, exact], query)).toEqual([exact, partial])
  })

  it('does not create phrase matches across fields, languages or separate aliases', () => {
    const splitOverview = createItem('Sprite.play', { overview: 'animation helper' })
    const splitLanguages = createItem('localized', { detail: { value: { en: 'play', zh: 'animation' } } })
    const splitAliases = createItem('aliases', { searchKeywords: ['play', 'animation'] })
    const phrase = createItem('phrase', { detail: { value: 'Play animation with a given name' } })
    expect(searchAPIReferenceItems([splitOverview, splitLanguages, splitAliases, phrase], 'play animation')).toEqual([
      phrase,
      splitOverview,
      splitLanguages,
      splitAliases
    ])
  })

  it('ranks more matched words first when no complete query phrase matches', () => {
    const one = createItem('one', { searchKeywords: ['animation'] })
    const two = createItem('two', { searchKeywords: ['animation', 'play'] })
    const three = createItem('three', { searchKeywords: ['animation', 'play', 'fast'] })
    expect(searchAPIReferenceItems([one, two, three], 'play animation fast')).toEqual([three, two, one])
  })

  it('counts repeated input words once and preserves the original order for equal relevance', () => {
    const animation = createItem('first', { searchKeywords: ['animation'] })
    const play = createItem('second', { searchKeywords: ['play'] })
    expect(searchAPIReferenceItems([animation, play], 'play play animation')).toEqual([animation, play])
  })

  it('sorts a new result array without changing the input array or item data', () => {
    const partial = createItem('Sprite.animateAndWait')
    const exact = createItem('Sprite.animate')
    const items = [partial, exact]
    const before = structuredClone(items)
    Object.freeze(items)
    const results = searchAPIReferenceItems(items, 'animate')
    expect(results).toEqual([exact, partial])
    expect(results).not.toBe(items)
    expect(results[0]).toBe(exact)
    expect(items).toEqual(before)
  })

  it('returns the original items for empty or whitespace-only queries', () => {
    const items = [animate0, gamePlay0]
    expect(searchAPIReferenceItems(items, '')).toBe(items)
    expect(searchAPIReferenceItems(items, ' \t\n ')).toBe(items)
  })
})
