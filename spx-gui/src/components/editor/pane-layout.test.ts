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

  it.each([classic, landscape])('fits four sprite cards without excessive trailing space for %s', (viewport) => {
    const result = getPaneLayout({ width: 1408, height: 820 }, viewport, 'landscape')
    const spritePanelWidth = result.previewWidth - 80 - 16
    const fourSpriteCardsWidth = 12 + 88 * 4 + 8 * 3
    expect(spritePanelWidth).toBeGreaterThanOrEqual(fourSpriteCardsWidth)
    expect(spritePanelWidth - fourSpriteCardsWidth).toBeLessThanOrEqual(20)
  })

  it('sizes the portrait preview from the available height', () => {
    expect(getPaneLayout({ width: 1408, height: 820 }, portrait, 'portrait').previewWidth).toBe(475)
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
      expect(result.previewWidth).toBeGreaterThanOrEqual(414)
      expect(result.previewWidth).toBeLessThanOrEqual(453)
      expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(Math.max(width, 814))
    }
  })

  it('preserves the portrait preview ratio at the minimum supported 1280x800 screen size', () => {
    const minimumScreenContent = getPaneLayout({ width: 1248, height: 728 }, portrait, 'portrait')
    expect(minimumScreenContent.codeWidth).toBeGreaterThanOrEqual(384)
    expect(minimumScreenContent.previewWidth).toBe(423)

    const previewBodyWidth = minimumScreenContent.previewWidth - 104 - 16 - 24
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
