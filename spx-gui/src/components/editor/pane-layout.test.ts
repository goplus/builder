import { describe, expect, it } from 'vitest'
import { getPaneLayout, type EditorLayout } from './pane-layout'

const landscape = { width: 545, height: 307 }
const portrait = { width: 307, height: 545 }
const classic = { width: 480, height: 360 }

describe('editor pane layout', () => {
  it('uses the base preview size until a width is chosen', () => {
    const container = { width: 1196, height: 782 }
    const initial = getPaneLayout(container, landscape, 'landscape', null)
    expect(initial.previewWidth).toBe(569)
    const resized = getPaneLayout(container, landscape, 'landscape', initial.codeWidth + 120)
    expect(resized.codeWidth).toBeCloseTo(initial.codeWidth + 120)
    expect(resized.previewWidth).toBeCloseTo(initial.previewWidth - 120)
  })

  it.each([
    [classic, 'landscape', 496],
    [landscape, 'landscape', 569],
    [portrait, 'portrait', 459]
  ] as const)('uses a %s base preview width of %i', (viewport, layout, previewWidth) => {
    expect(getPaneLayout({ width: 1408, height: 820 }, viewport, layout, null).previewWidth).toBe(previewWidth)
  })

  it.each(['landscape', 'focused'] as EditorLayout[])('keeps both panes within the container in %s mode', (layout) => {
    for (const width of [500, 887, 1196, 1480]) {
      for (const preferred of [-1000, 384, 600, 10000, null]) {
        const result = getPaneLayout(
          { width, height: 782 },
          layout === 'portrait' ? portrait : landscape,
          layout,
          preferred
        )
        expect(result.codeWidth).toBeGreaterThanOrEqual(384)
        expect(result.previewWidth).toBeGreaterThanOrEqual(0)
        expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(width)
      }
    }
  })

  it('keeps the portrait editor usable with horizontal overflow in a narrow window', () => {
    for (const width of [500, 700, 720, 887, 1196, 1480]) {
      for (const preferred of [-1000, 384, 600, 10000, null]) {
        const result = getPaneLayout({ width, height: 782 }, portrait, 'portrait', preferred)
        expect(result.codeWidth).toBeGreaterThanOrEqual(384)
        expect(result.previewWidth).toBeGreaterThanOrEqual(448)
        expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(Math.max(width, 848))
      }
    }
  })

  it('keeps the portrait base preview size at the minimum desktop size', () => {
    const regularDesktop = getPaneLayout({ width: 1408, height: 820 }, portrait, 'portrait', null)
    expect(regularDesktop.previewWidth).toBe(459)

    const minimumDesktop = getPaneLayout({ width: 1248, height: 720 }, portrait, 'portrait', null)
    expect(minimumDesktop.codeWidth).toBeGreaterThanOrEqual(384)
    expect(minimumDesktop.previewWidth).toBe(459)
  })

  it('moves continuously across the portrait drag range without changing the bounds', () => {
    const container = { width: 1480, height: 782 }
    const initial = getPaneLayout(container, portrait, 'portrait', null)
    for (let width = initial.minCodeWidth; width <= initial.maxCodeWidth; width += 16) {
      const resized = getPaneLayout(container, portrait, 'portrait', width)
      expect(resized.codeWidth).toBeCloseTo(width)
      expect(resized.minCodeWidth).toBeCloseTo(initial.minCodeWidth)
      expect(resized.maxCodeWidth).toBeCloseTo(initial.maxCodeWidth)
      expect(resized.previewWidth).toBeGreaterThanOrEqual(448)
    }
  })

  it('allows the focused preview to shrink below its previous fixed minimum', () => {
    const result = getPaneLayout({ width: 1196, height: 782 }, portrait, 'focused', 800)
    expect(result.codeWidth).toBe(800)
    expect(result.previewWidth).toBe(380)
  })

  it('clamps a previously chosen width when the browser gets narrower', () => {
    const result = getPaneLayout({ width: 887, height: 782 }, landscape, 'landscape', 900)
    expect(result.previewWidth).toBe(320)
    expect(result.codeWidth).toBe(551)
  })
})
