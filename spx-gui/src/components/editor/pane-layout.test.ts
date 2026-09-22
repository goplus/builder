import { describe, expect, it } from 'vitest'
import { getPaneLayout, type EditorLayout } from './pane-layout'

const landscape = { width: 720, height: 405 }
const portrait = { width: 620, height: 900 }

describe('editor pane layout', () => {
  it('preserves the automatic landscape layout until a width is chosen', () => {
    const container = { width: 1196, height: 782 }
    const initial = getPaneLayout(container, landscape, 'landscape', null)
    expect(initial.previewWidth).toBeCloseTo(478.4)
    const resized = getPaneLayout(container, landscape, 'landscape', initial.codeWidth + 120)
    expect(resized.codeWidth).toBeCloseTo(initial.codeWidth + 120)
    expect(resized.previewWidth).toBeCloseTo(initial.previewWidth - 120)
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
        expect(result.previewWidth).toBeGreaterThanOrEqual(320)
        expect(result.codeWidth + result.previewWidth + 16).toBeCloseTo(Math.max(width, 720))
      }
    }
  })

  it('leaves room for bottom panels when expanding a landscape preview', () => {
    const result = getPaneLayout({ width: 1480, height: 782 }, landscape, 'landscape', 0)
    const previewHeight = (result.previewWidth - 24) / (720 / 405) + 72
    expect(previewHeight + 16 + 200).toBeLessThanOrEqual(782)
  })

  it('moves continuously across the portrait drag range without changing the bounds', () => {
    const container = { width: 1480, height: 782 }
    const initial = getPaneLayout(container, portrait, 'portrait', null)
    for (let width = initial.minCodeWidth; width <= initial.maxCodeWidth; width += 16) {
      const resized = getPaneLayout(container, portrait, 'portrait', width)
      expect(resized.codeWidth).toBeCloseTo(width)
      expect(resized.minCodeWidth).toBeCloseTo(initial.minCodeWidth)
      expect(resized.maxCodeWidth).toBeCloseTo(initial.maxCodeWidth)
      expect(resized.previewWidth).toBeGreaterThanOrEqual(320)
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
