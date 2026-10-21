import { describe, expect, it } from 'vitest'
import { getSpotlightPosition } from './placement'

describe('Spotlight placement', () => {
  it('uses the space occupied by the arrow and tip when choosing above or below', () => {
    const position = getSpotlightPosition(
      new DOMRect(500, 688, 50, 50),
      { width: 113, height: 28 },
      { width: 1280, height: 800 }
    )
    expect(position).toEqual({ x: 566, y: 672, placement: 'top-right' })
    expect(position.y - 28 - 24).toBeGreaterThanOrEqual(16)
    expect(position.y).toBeLessThanOrEqual(784)
  })

  it.each([
    new DOMRect(0, 0, 50, 50),
    new DOMRect(1230, 0, 50, 50),
    new DOMRect(0, 750, 50, 50),
    new DOMRect(1230, 750, 50, 50),
    new DOMRect(0, 0, 1280, 800),
    new DOMRect(16, 350, 1248, 50),
    new DOMRect(600, 16, 50, 768)
  ])('keeps the arrow and the complete tip inside the viewport for target %j', (target) => {
    const { x, y, placement } = getSpotlightPosition(target, { width: 280, height: 180 }, { width: 1280, height: 800 })
    const right = placement.endsWith('right')
    const below = placement.startsWith('bottom')
    const horizontalOffset = below ? 20 : 23
    const tipLeft = right ? x + horizontalOffset : x - 280 - horizontalOffset
    const tipTop = below ? y + 22 : y - 180 - 24
    const arrowLeft = right ? x : x - 26
    const arrowTop = below ? y : y - 26
    expect(Math.min(tipLeft, arrowLeft)).toBeGreaterThanOrEqual(16)
    expect(Math.max(tipLeft + 280, arrowLeft + 26)).toBeLessThanOrEqual(1264)
    expect(Math.min(tipTop, arrowTop)).toBeGreaterThanOrEqual(16)
    expect(Math.max(tipTop + 180, arrowTop + 26)).toBeLessThanOrEqual(784)
  })
})
