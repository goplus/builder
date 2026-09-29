import { describe, expect, it } from 'vitest'
import { getPaneLayout, type EditorLayout } from './pane-layout'

const landscape = { width: 545, height: 307 }
const portrait = { width: 307, height: 545 }
const classic = { width: 480, height: 360 }

describe('editor pane layout', () => {
  it('uses the base preview size when it fits the area limit', () => {
    const container = { width: 1196, height: 782 }
    const result = getPaneLayout(container, landscape, 'landscape')
    expect(result.previewWidth).toBe(540)
    expect(result.codeWidth).toBe(640)
  })

  it.each([
    [classic, 'landscape', 471],
    [landscape, 'landscape', 540],
    [portrait, 'portrait', 434]
  ] as const)('caps a %s preview at %i pixels wide', (viewport, layout, previewWidth) => {
    expect(getPaneLayout({ width: 1408, height: 820 }, viewport, layout).previewWidth).toBe(previewWidth)
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
      expect(result.previewWidth).toBeLessThanOrEqual(434)
      expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(Math.max(width, 814))
    }
  })

  it('shrinks the portrait preview at the minimum desktop size to keep the stage visible', () => {
    const regularDesktop = getPaneLayout({ width: 1408, height: 820 }, portrait, 'portrait')
    expect(regularDesktop.previewWidth).toBe(434)

    const minimumDesktop = getPaneLayout({ width: 1248, height: 720 }, portrait, 'portrait')
    expect(minimumDesktop.codeWidth).toBeGreaterThanOrEqual(384)
    expect(minimumDesktop.previewWidth).toBe(432)
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
