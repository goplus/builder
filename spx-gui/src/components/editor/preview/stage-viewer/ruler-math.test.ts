import { describe, expect, it } from 'vitest'
import { turnAngle } from './ruler-math'

// Positions are in map coordinates: x right, y down. Headings follow spx: 0 = up, 90 = right.
describe('turnAngle', () => {
  const origin = { x: 0, y: 0 }

  it('should be 0 when the target lies straight ahead', () => {
    expect(turnAngle(origin, { x: 0, y: -100 }, 0)).toBe(0) // facing up, target above
    expect(turnAngle(origin, { x: 100, y: 0 }, 90)).toBe(0) // facing right, target to the right
    expect(turnAngle(origin, { x: -100, y: 0 }, -90)).toBe(0) // facing left, target to the left
  })

  it('should be positive when the target is to the right of the heading', () => {
    expect(turnAngle(origin, { x: 100, y: 0 }, 0)).toBe(90) // facing up, target right
    expect(turnAngle(origin, { x: 0, y: 100 }, 90)).toBe(90) // facing right, target below
    expect(turnAngle(origin, { x: 100, y: 100 }, 0)).toBe(135) // facing up, target down-right
  })

  it('should be negative when the target is to the left of the heading', () => {
    expect(turnAngle(origin, { x: -100, y: 0 }, 0)).toBe(-90) // facing up, target left
    expect(turnAngle(origin, { x: 100, y: -100 }, 90)).toBe(-45) // facing right, target up-right
  })

  it('should report a turn-around as 180, not -180', () => {
    expect(turnAngle(origin, { x: 0, y: 100 }, 0)).toBe(180) // facing up, target below
    expect(turnAngle(origin, { x: -100, y: 0 }, 90)).toBe(180) // facing right, target left
  })

  it('should stay in (-180, 180] for headings outside that range', () => {
    expect(turnAngle(origin, { x: 0, y: -100 }, 360)).toBe(0)
    expect(turnAngle(origin, { x: 100, y: 0 }, 630)).toBe(180) // 630 ≡ -90 (facing left), target right
  })
})
