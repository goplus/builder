import { describe, expect, it } from 'vitest'
import { turnAngle } from './ruler-math'

describe('turnAngle', () => {
  const origin = { x: 0, y: 0 }

  it('reads straight ahead as zero', () => {
    expect(turnAngle(origin, { x: 0, y: -100 }, 0)).toBe(0)
    expect(turnAngle(origin, { x: 100, y: 0 }, 90)).toBe(0)
    expect(turnAngle(origin, { x: -100, y: 0 }, -90)).toBe(0)
  })

  it('uses positive values for right turns and negative values for left turns', () => {
    expect(turnAngle(origin, { x: 100, y: 0 }, 0)).toBe(90)
    expect(turnAngle(origin, { x: 0, y: 100 }, 90)).toBe(90)
    expect(turnAngle(origin, { x: -100, y: 0 }, 0)).toBe(-90)
    expect(turnAngle(origin, { x: 100, y: -100 }, 90)).toBe(-45)
  })

  it('uses 180 rather than negative 180 for a turn-around', () => {
    expect(turnAngle(origin, { x: 0, y: 100 }, 0)).toBe(180)
    expect(turnAngle(origin, { x: -100, y: 0 }, 90)).toBe(180)
  })
})
