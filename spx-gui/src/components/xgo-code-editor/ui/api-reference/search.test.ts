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
import { forIterate } from '../../document-base/xgo'
import { searchAPIReferenceItems } from './search'

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

  it.each(['换装', '换服装', '更换服装', '换衣服', 'change clothes', 'change costume'])(
    'distinguishes changing a costume from querying its name with %s',
    (query) => {
      expect(searchAPIReferenceItems([costumeName, setCostume], query)).toEqual([setCostume])
    }
  )

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

  it.each(['animate', 'ANIMATE', 'Sprite.animate', 'play animation', '  PLAY   ANIMATION  ', '播放动画', '播放 动画'])(
    'finds all three playback variants with %s, without sound playback or stopping animation',
    (query) => {
      const items = [gamePlay0, animate0, animate1, animateAndWait, stopAnimation]
      expect(searchAPIReferenceItems(items, query)).toEqual([animate0, animate1, animateAndWait])
    }
  )

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
    expect(searchAPIReferenceItems([gamePlay0, forIterate], 'play animation')).toEqual([])
  })

  it('requires all search words to match', () => {
    expect(searchAPIReferenceItems([animate0, gamePlay0], 'play nonexistent')).toEqual([])
  })

  it('returns the original items for empty or whitespace-only queries', () => {
    const items = [animate0, gamePlay0]
    expect(searchAPIReferenceItems(items, '')).toBe(items)
    expect(searchAPIReferenceItems(items, ' \t\n ')).toBe(items)
  })
})
