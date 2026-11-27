import { describe, expect, it, vi } from 'vitest'
import * as exception from '@/utils/exception'
import { packageSpx } from '@/utils/spx'
import { createAPIReferenceSearch } from '@/apis/api-reference'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import {
  DocumentBase,
  getTextDocumentId,
  parseDefinitionId,
  stringifyDefinitionId,
  type APIReferenceContext,
  type APIReferenceItem
} from '@/components/xgo-code-editor'
import * as spxDefinitions from '../document-base'
import { keys } from '../document-base/key'
import { SpxAPIReferenceProvider } from '.'
import { getAPIReferenceSearchText } from './search'

vi.mock('@/apis/api-reference', () => ({ createAPIReferenceSearch: vi.fn() }))

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

  it('preserves configured order and expands overloads in documentation order', async () => {
    const apis = ['Sprite.turnTo#2', 'Sprite.onKey', 'Sprite.stepTo#2']
    expect(await references(apis.map(spxId))).toEqual([
      spxDefinitions.turnTo2,
      spxDefinitions.spriteOnKey0,
      spxDefinitions.spriteOnKey1,
      spxDefinitions.stepTo2
    ])
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

  it('selects documented methods, constants and types', async () => {
    const apis = [
      'Widget.hide',
      'Monitor.hide',
      'TurningInfo.NewDir',
      'List.append',
      'Camera.zoom',
      'Right',
      'KeyUp',
      'Prev',
      'Monitor'
    ].map(spxId)
    const items = await references(apis)
    expect(items.map((item) => stringifyDefinitionId(item.definition)).sort()).toEqual(apis.sort())
  })

  it('offers Game methods on the stage and Sprite counterparts in sprite code', async () => {
    const apis = ['Game.onKey#0', 'Sprite.onKey#0', 'Sprite.turnTo#2'].map(spxId)
    expect(await references(apis, 'main.spx')).toEqual([spxDefinitions.gameOnKey0])
    const items = await references(apis)
    expect(items).toEqual(expect.arrayContaining([spxDefinitions.spriteOnKey0, spxDefinitions.turnTo2]))
    expect(items).toHaveLength(2)
  })

  it('keeps Game methods shadowed in sprite code even when their Sprite counterparts are not selected', async () => {
    const apis = [spxId('Game.onKey#0')]
    expect(await references(apis)).toEqual([])
    expect(await references(apis, 'main.spx')).toEqual([spxDefinitions.gameOnKey0])
  })

  it('offers the default backdrop listener for the active context', async () => {
    const spriteItems = await references(null)
    expect(spriteItems).toContainEqual(spxDefinitions.spriteOnBackdrop1)
    expect(spriteItems).not.toContainEqual(spxDefinitions.gameOnBackdrop1)
    const stageItems = await references(null, 'main.spx')
    expect(stageItems).toContainEqual(spxDefinitions.gameOnBackdrop1)
    expect(stageItems).not.toContainEqual(spxDefinitions.spriteOnBackdrop1)
  })

  it('resolves Game and Sprite methods by context before selecting overloads', async () => {
    const apis = ['Game.onKey#0', 'Sprite.onKey#1'].map(spxId)
    expect(await references(apis)).toEqual([spxDefinitions.spriteOnKey1])
    expect(await references(apis, 'main.spx')).toEqual([spxDefinitions.gameOnKey0])
  })
})

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
  const provider = new SpxAPIReferenceProvider(new DocumentBase())
  it('retains related animation variants while excluding distant semantic results', async () => {
    const items = candidates()
    const signal = new AbortController().signal
    vi.mocked(createAPIReferenceSearch).mockResolvedValue({
      scores: [0.8, 0.82, 0.67, 0.4]
    })
    expect(await provider.searchAPIReference(items, '播放动画', signal)).toEqual([items[1], items[0]])
    expect(createAPIReferenceSearch).toHaveBeenLastCalledWith(
      {
        query: '播放动画',
        candidates: items.map(getAPIReferenceSearchText)
      },
      signal
    )
  })

  it('allows no match and keeps direct names even below the semantic threshold', async () => {
    const items = candidates()
    vi.mocked(createAPIReferenceSearch).mockResolvedValue({
      scores: items.map(() => 0.5)
    })
    expect(await provider.searchAPIReference(items, '明天的天气', new AbortController().signal)).toEqual([])
    expect(await provider.searchAPIReference(items, 'animate', new AbortController().signal)).toEqual(items.slice(0, 2))
  })

  it('reports malformed scores and falls back to name matching', async () => {
    const capture = vi.spyOn(exception, 'capture')
    const items = candidates()
    vi.mocked(createAPIReferenceSearch).mockResolvedValue({ scores: [0.9] })
    await expect(provider.searchAPIReference(items, 'animate', new AbortController().signal)).resolves.toEqual(
      items.slice(0, 2)
    )
    expect(capture).toHaveBeenCalledExactlyOnceWith(expect.any(Error), 'POST /api-reference-searches failed')
    capture.mockRestore()
  })

  it.each([
    { code: ApiExceptionCode.errorServiceUnavailable, reported: false },
    { code: ApiExceptionCode.errorRateLimitExceeded, reported: true },
    { code: ApiExceptionCode.errorInternalServerError, reported: true },
    { code: ApiExceptionCode.errorGatewayTimeout, reported: true }
  ])('falls back after search API error $code (reported: $reported)', async ({ code, reported }) => {
    const capture = vi.spyOn(exception, 'capture')
    const items = candidates()
    const error = new ApiException(code, 'Search failed', {
      req: new Request('https://example.test/api-reference-searches', { method: 'POST' })
    })
    vi.mocked(createAPIReferenceSearch).mockRejectedValueOnce(error)

    await expect(provider.searchAPIReference(items, 'animate', new AbortController().signal)).resolves.toEqual(
      items.slice(0, 2)
    )
    if (reported) expect(capture).toHaveBeenCalledExactlyOnceWith(error, 'POST /api-reference-searches failed')
    else expect(capture).not.toHaveBeenCalled()
    capture.mockRestore()
  })

  it('preserves cancellation instead of returning name matches', async () => {
    const controller = new AbortController()
    const reason = new exception.Cancelled('Search replaced')
    vi.mocked(createAPIReferenceSearch).mockRejectedValueOnce(reason)
    const result = provider.searchAPIReference(candidates(), 'animate', controller.signal)
    controller.abort(reason)

    await expect(result).rejects.toBe(reason)
  })
})
