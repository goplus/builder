import { describe, expect, it } from 'vitest'
import { packageSpx } from '@/utils/spx'
import {
  DocumentBase,
  getTextDocumentId,
  parseDefinitionId,
  stringifyDefinitionId,
  type APIReferenceContext
} from '@/components/xgo-code-editor'
import * as spxDefinitions from '../document-base'
import { keys } from '../document-base/key'
import { SpxAPIReferenceProvider } from '.'

function spxId(name: string) {
  return `xgo:${packageSpx}?${name}`
}

async function references(apis: string[] | null, file = 'Lita.spx') {
  const documentBase = new DocumentBase([...Object.values(spxDefinitions), ...keys])
  const provider = new SpxAPIReferenceProvider(documentBase, apis?.map(parseDefinitionId) ?? null)
  return provider.provideAPIReference({
    textDocument: { id: getTextDocumentId(file) },
    signal: new AbortController().signal
  } as APIReferenceContext)
}

describe('SPX API Reference selection', () => {
  it('offers both direction turnTo forms by default and keeps other APIs curated', async () => {
    const items = await references(null)
    expect(items).toContainEqual(spxDefinitions.turnTo2)
    expect(items).toContainEqual(spxDefinitions.turnTo6)
    expect(items).not.toContainEqual(spxDefinitions.stepTo2)
    expect(items.some((item) => item.definition.name === 'var_declaration')).toBe(false)
  })

  it('selects documented APIs and language snippets outside the default list', async () => {
    const apis = [spxId('Sprite.stepTo#2'), spxId('Sprite.onAnyKey'), 'xgo:?var_declaration']
    const items = await references(apis)
    expect(items.map((item) => stringifyDefinitionId(item.definition)).sort()).toEqual(apis.sort())
    expect(items).toContainEqual(spxDefinitions.stepTo2)
  })

  it('selects only the requested direction overload', async () => {
    expect(await references([spxId('Sprite.turnTo#2')])).toEqual([spxDefinitions.turnTo2])
  })

  it.each([
    { name: 'Sprite.onKey', overloads: ['0', '1'] },
    { name: 'Sprite.stepTo', overloads: ['0', '2', '3', '4', '6', '7', '8', 'a', 'b'] },
    { name: 'Sprite.turnTo', overloads: ['0', '2', '3', '4', '6', '7', '8', 'a', 'b'] }
  ])('selects all recommended overloads of $name', async ({ name, overloads }) => {
    const items = await references([spxId(name)])
    expect(items.map((item) => item.definition.overloadId).sort()).toEqual(overloads)
  })

  it.each(['Sprite.turnTo#1', 'Sprite.glide#3', 'Sprite.onKey#2', 'Game.onKey#2'])(
    'keeps hidden %s excluded when selected explicitly',
    async (name) => {
      expect(await references([spxId(name)])).toEqual([])
    }
  )

  it.each([
    { apis: [] },
    { apis: [spxId('Sprite.missing')] },
    { apis: [spxId('Sprite.stepTo#unknown')] },
    { apis: ['xgo:unknown?Sprite.stepTo'] }
  ])('returns no entries for empty or unknown selections: $apis', async ({ apis }) => {
    expect(await references(apis)).toEqual([])
  })

  it('excludes entries without a usable receiver or a supported Reference category', async () => {
    const apis = ['Widget.hide', 'Monitor.hide', 'Monitor', 'TurningInfo.NewDir', 'Prev', 'List.append']
    expect(await references(apis.map(spxId))).toEqual([])
  })

  it('keeps qualified Camera entries and categorized constants', async () => {
    const apis = ['Camera.zoom', 'Right', 'KeyUp'].map(spxId)
    const items = await references(apis)
    expect(items.map((item) => stringifyDefinitionId(item.definition)).sort()).toEqual(apis.sort())
  })

  it('offers Game methods on the stage and prefers selected Sprite counterparts in sprite code', async () => {
    const apis = ['Game.onKey#0', 'Sprite.onKey#0', 'Sprite.turnTo#2'].map(spxId)
    expect(await references(apis, 'main.spx')).toEqual([spxDefinitions.gameOnKey0])
    const items = await references(apis)
    expect(items).toEqual(expect.arrayContaining([spxDefinitions.spriteOnKey0, spxDefinitions.turnTo2]))
    expect(items).toHaveLength(2)
  })

  it('does not let unselected Sprite methods suppress explicit Game selections', async () => {
    expect(await references([spxId('Game.onKey#0')])).toEqual([spxDefinitions.gameOnKey0])
  })

  it('preserves distinct selected overloads when Game and Sprite share a method name', async () => {
    const items = await references(['Game.onKey#1', 'Sprite.onKey#0'].map(spxId))
    expect(items).toEqual(expect.arrayContaining([spxDefinitions.gameOnKey1, spxDefinitions.spriteOnKey0]))
    expect(items).toHaveLength(2)
  })
})
