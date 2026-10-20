import { describe, expect, it } from 'vitest'
import type { APIReferenceContext } from '@/components/xgo-code-editor/api-reference'
import { getTextDocumentId, stringifyDefinitionId } from '@/components/xgo-code-editor/common'
import { DocumentBase } from '@/components/xgo-code-editor/document-base'
import { searchAPIReferenceItems } from '@/components/xgo-code-editor/ui/api-reference/search'
import * as spxDefinitions from '../document-base'
import { keys } from '../document-base/key'
import { SpxAPIReferenceProvider } from '.'
import { withSearchKeywords } from './search-keywords'

function createReferenceProvider() {
  return new SpxAPIReferenceProvider(new DocumentBase([...Object.values(spxDefinitions), ...keys]))
}

function context(path: string) {
  return {
    textDocument: { id: getTextDocumentId(path) },
    signal: new AbortController().signal
  } as APIReferenceContext
}

describe('Spx API Reference search keywords', () => {
  it.each([
    ['讲话', 'Sprite.say'],
    ['speech bubble', 'Sprite.say'],
    ['想一想', 'Sprite.think'],
    ['无限循环', 'forever'],
    ['repeat times', 'repeat'],
    ['循环直到', 'repeatUntil'],
    ['遍历列表', 'for_iterate'],
    ['for each', 'for_iterate'],
    ['不然', 'if_else_statement'],
    ['等一会', 'Game.wait'],
    ['delay', 'Game.wait'],
    ['秒表', 'Game.timer'],
    ['重新计时', 'Game.resetTimer'],
    ['前进', 'Sprite.step'],
    ['walk', 'Sprite.step'],
    ['走到', 'Sprite.stepTo'],
    ['smooth move', 'Sprite.glide'],
    ['左右移动', 'Sprite.changeXpos'],
    ['放大', 'Sprite.setSize'],
    ['shrink', 'Sprite.changeSize'],
    ['换造型', 'Sprite.setCostume'],
    ['clothes', 'Sprite.setCostume'],
    ['换场景', 'Game.setBackdrop'],
    ['switch scene', 'Game.setBackdrop'],
    ['置顶', 'Front'],
    ['亮度', 'Sprite.setGraphicEffect'],
    ['背景音乐', 'Sprite.play'],
    ['BGM', 'Sprite.play'],
    ['继续播放', 'Sprite.resumePlaying'],
    ['louder', 'Sprite.changeVolume'],
    ['输入的文字', 'Game.answer'],
    ['分身', 'Sprite.clone'],
    ['地面检测', 'Sprite.isOnFloor'],
    ['jump', 'Sprite.addImpulse'],
    ['镜头', 'Camera.follow'],
    ['zoom in', 'Camera.setZoom'],
    ['控制台', 'println'],
    ['quit game', 'exit']
  ])('finds %s as %s', async (query, name) => {
    const items = await createReferenceProvider().provideAPIReference(context('牛小七.spx'))
    const found = searchAPIReferenceItems(items, query)
    const expected = items.filter((item) => item.definition.name === name)
    expect(expected.length).toBeGreaterThan(0)
    expect(found).toEqual(expect.arrayContaining(expected))
  })

  it('covers every available sprite and stage entry with Chinese and English synonyms', async () => {
    const provider = createReferenceProvider()
    const sprite = await provider.provideAPIReference(context('牛小七.spx'))
    const stage = await provider.provideAPIReference(context('main.spx'))
    const items = new Map([...sprite, ...stage].map((item) => [stringifyDefinitionId(item.definition), item]))
    for (const [id, item] of items) {
      expect(
        item.searchKeywords?.some((word) => /\p{Script=Han}/u.test(word)),
        id
      ).toBe(true)
      expect(
        item.searchKeywords?.some((word) => /^[a-z ]+$/i.test(word)),
        id
      ).toBe(true)
    }
    expect(searchAPIReferenceItems(stage, '服装')).toEqual([])
    expect(searchAPIReferenceItems(stage, '换背景').length).toBeGreaterThan(0)
  })

  it('distinguishes key events, held keys, receiver-specific clicks and loop variants', async () => {
    const provider = createReferenceProvider()
    const sprite = await provider.provideAPIReference(context('牛小七.spx'))
    const stage = await provider.provideAPIReference(context('main.spx'))
    const names = (query: string) => searchAPIReferenceItems(sprite, query).map((item) => item.definition.name)
    expect(names('按住按键')).toEqual(['Game.keyPressed'])
    expect(names('按下按键')).toEqual(['Sprite.onKey'])
    expect(names('点击角色')).toEqual(['Sprite.onClick'])
    expect(searchAPIReferenceItems(stage, '点击角色')).toEqual([])
    expect(searchAPIReferenceItems(stage, '点击舞台').map((item) => item.definition.name)).toEqual(['Game.onClick'])
    expect(searchAPIReferenceItems(sprite, '循环动画').map((item) => item.definition.overloadId)).toEqual(['1'])
    expect(searchAPIReferenceItems(sprite, '循环音乐').map((item) => item.definition.overloadId)).toEqual(['1'])
    expect(
      searchAPIReferenceItems(sprite, '置顶')
        .filter((item) => item.definition.name === 'Sprite.setLayer')
        .map((item) => item.definition.overloadId)
    ).toEqual(['0'])
    expect(names('前进')).not.toContain('Forward')
  })

  it('preserves existing documentation, insertion data and aliases without mutating them', () => {
    const original = spxDefinitions.setCostume
    const keywords = [...(original.searchKeywords ?? [])]
    const enriched = withSearchKeywords(original)
    expect({ ...enriched, searchKeywords: original.searchKeywords }).toEqual(original)
    expect(enriched.insertSnippet).toBe(original.insertSnippet)
    expect(enriched.detail).toBe(original.detail)
    expect(enriched.searchKeywords).toEqual(expect.arrayContaining(keywords))
    expect(original.searchKeywords).toEqual(keywords)
  })
})
