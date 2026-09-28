import { describe, expect, it } from 'vitest'
import { clampLabelToRect, getVisibleMapRect, type LabelLayout } from './ruler-layout'

const label: LabelLayout = { x: -20, y: 280, width: 40, height: 22, text: '90°' }

describe('ruler label layout', () => {
  it('computes the visible map area after camera panning', () => {
    expect(getVisibleMapRect({ x: -120, y: -40 }, { width: 1000, height: 700 }, { width: 640, height: 480 })).toEqual({
      left: 120,
      top: 40,
      right: 760,
      bottom: 520
    })
  })

  it('keeps labels inside all four viewport edges', () => {
    const rect = { left: 0, top: 0, right: 320, bottom: 240 }
    for (const layout of [
      { ...label, x: -20, y: -20 },
      { ...label, x: 300, y: -20 },
      { ...label, x: -20, y: 230 },
      { ...label, x: 300, y: 230 }
    ]) {
      const clamped = clampLabelToRect(layout, rect)
      expect(clamped.x).toBeGreaterThanOrEqual(4)
      expect(clamped.y).toBeGreaterThanOrEqual(4)
      expect(clamped.x + clamped.width).toBeLessThanOrEqual(316)
      expect(clamped.y + clamped.height).toBeLessThanOrEqual(236)
    }
  })

  it('keeps labels in the visible window when the map is panned', () => {
    const rect = getVisibleMapRect({ x: -120, y: -40 }, { width: 1000, height: 700 }, { width: 640, height: 480 })
    const clamped = clampLabelToRect({ ...label, x: 50, y: 600 }, rect)
    expect(clamped.x).toBe(124)
    expect(clamped.y).toBe(494)
  })
})
