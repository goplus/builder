import { describe, expect, it } from 'vitest'
import { getPaneLayout, type EditorLayout } from './pane-layout'

const landscape = { width: 545, height: 307 }
const portrait = { width: 307, height: 545 }
const classic = { width: 480, height: 360 }

describe('editor pane layout', () => {
  it('uses the base preview size when it fits the area limit', () => {
    const container = { width: 1196, height: 782 }
    const result = getPaneLayout(container, landscape, 'landscape')
    expect(result.previewWidth).toBe(504)
    expect(result.codeWidth).toBe(676)
  })

  it.each([
    [classic, 'landscape', 496],
    [landscape, 'landscape', 504]
  ] as const)('uses the base width for a %s preview in %s mode', (viewport, layout, previewWidth) => {
    expect(getPaneLayout({ width: 1408, height: 820 }, viewport, layout).previewWidth).toBe(previewWidth)
  })

  it.each([classic, landscape])('fits five sprite cards without excessive trailing space for %s', (viewport) => {
    const result = getPaneLayout({ width: 1408, height: 820 }, viewport, 'landscape')
    const spritePanelWidth = result.previewWidth - 80 - 16
    const fiveSpriteCardsWidth = 12 + 72 * 5 + 6 * 4
    expect(spritePanelWidth).toBeGreaterThanOrEqual(fiveSpriteCardsWidth)
    expect(spritePanelWidth - fiveSpriteCardsWidth).toBeLessThanOrEqual(20)
  })

  it('sizes the portrait preview from the available height', () => {
    expect(getPaneLayout({ width: 1408, height: 820 }, portrait, 'portrait').previewWidth).toBe(459)
  })

  it.each([
    { width: 1248, height: 728 },
    { width: 1408, height: 828 }
  ])('keeps a single sprite column on smaller portrait screens: %s', (container) => {
    expect(getPaneLayout(container, portrait, 'portrait').spriteRailWidth).toBe(88)
  })

  it('adds a second portrait sprite column on large screens without shrinking the preview', () => {
    const container = { width: 1888, height: 1008 }
    const singleColumn = getPaneLayout(container, portrait, 'portrait')
    const twoColumns = getPaneLayout(container, portrait, 'portrait', true)

    expect(twoColumns.spriteRailWidth).toBe(166)
    expect(twoColumns.previewWidth - twoColumns.spriteRailWidth).toBe(
      singleColumn.previewWidth - singleColumn.spriteRailWidth
    )
    expect(twoColumns.codeWidth).toBe(singleColumn.codeWidth - 78)
    expect(twoColumns.codeWidth).toBeGreaterThanOrEqual(384)
    expect(twoColumns.codeWidth + twoColumns.previewWidth + 16).toBe(container.width)
  })

  it('fits two compact sprite cards with balanced horizontal insets', () => {
    const result = getPaneLayout({ width: 1888, height: 1008 }, portrait, 'portrait', true)
    const leftInset = 8
    const cardsWidth = 72 * 2 + 6
    expect(result.spriteRailWidth - leftInset - cardsWidth).toBe(leftInset)
  })

  it.each([0, 6, 8, 15])(
    'fits one compact sprite card with a %ipx scrollbar gutter and balanced insets',
    (scrollbarWidth) => {
      const result = getPaneLayout({ width: 1408, height: 828 }, portrait, 'portrait', false, scrollbarWidth)
      expect(result.spriteRailWidth - scrollbarWidth - 8 * 2).toBe(72)
    }
  )

  it.each([0, 6, 8, 15])('reserves a %ipx scrollbar gutter outside the portrait sprite columns', (scrollbarWidth) => {
    const container = { width: 1888, height: 1008 }
    const overlay = getPaneLayout(container, portrait, 'portrait', true)
    const result = getPaneLayout(container, portrait, 'portrait', true, scrollbarWidth)
    expect(result.spriteRailWidth - scrollbarWidth - 8 * 2).toBe(72 * 2 + 6)
    expect(result.previewWidth - result.spriteRailWidth).toBe(overlay.previewWidth - overlay.spriteRailWidth)
    expect(result.codeWidth).toBeGreaterThanOrEqual(384)
  })

  it('preserves the minimum code width when the two-column portrait layout needs overflow', () => {
    const result = getPaneLayout({ width: 500, height: 782 }, portrait, 'portrait', true)
    expect(result.spriteRailWidth).toBe(166)
    expect(result.codeWidth).toBe(384)
    expect(result.previewWidth).toBe(476)
    expect(result.codeWidth + result.previewWidth + 16).toBe(876)
  })

  it.each(['landscape', 'focused'] as EditorLayout[])('does not change %s pane sizes on large screens', (layout) => {
    const container = { width: 1888, height: 1008 }
    const normal = getPaneLayout(container, landscape, layout)
    const large = getPaneLayout(container, landscape, layout, true)
    expect(large.previewWidth).toBe(normal.previewWidth)
    expect(large.codeWidth).toBe(normal.codeWidth)
  })

  it.each(['landscape', 'focused'] as EditorLayout[])('keeps both panes within the container in %s mode', (layout) => {
    for (const width of [500, 887, 1196, 1480]) {
      const result = getPaneLayout({ width, height: 782 }, landscape, layout)
      expect(result.codeWidth).toBeGreaterThanOrEqual(384)
      expect(result.previewWidth).toBeGreaterThanOrEqual(0)
      expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(width)
    }
  })

  it('keeps the portrait editor usable with horizontal overflow in a narrow window', () => {
    for (const width of [500, 700, 720, 887, 1196, 1480]) {
      const result = getPaneLayout({ width, height: 782 }, portrait, 'portrait')
      expect(result.codeWidth).toBeGreaterThanOrEqual(384)
      expect(result.previewWidth).toBeGreaterThanOrEqual(398)
      expect(result.previewWidth).toBeLessThanOrEqual(437)
      expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(Math.max(width, 798))
    }
  })

  it('preserves the portrait preview ratio at the minimum supported 1280x800 screen size', () => {
    const minimumScreenContent = getPaneLayout({ width: 1248, height: 728 }, portrait, 'portrait')
    expect(minimumScreenContent.codeWidth).toBeGreaterThanOrEqual(384)
    expect(minimumScreenContent.previewWidth).toBe(407)

    const previewBodyWidth = minimumScreenContent.previewWidth - 88 - 16 - 24
    const previewBodyHeight = 728 - 48 - 24 - 16 - 144
    expect(previewBodyWidth / previewBodyHeight).toBeCloseTo(portrait.width / portrait.height, 2)
  })

  it('uses the focused default ratio while preserving the minimum code width', () => {
    const result = getPaneLayout({ width: 1196, height: 782 }, portrait, 'focused')
    expect(result.codeWidth).toBe(520)
    expect(result.previewWidth).toBe(660)
  })

  it('lets the preview shrink below its area minimum when the browser gets narrower', () => {
    const result = getPaneLayout({ width: 887, height: 782 }, landscape, 'landscape')
    expect(result.previewWidth).toBe(487)
    expect(result.codeWidth).toBe(384)
  })
})
