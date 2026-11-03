import { describe, expect, it } from 'vitest'
import { snapToNearestTarget, turnAngle } from './ruler-math'

describe('snapToNearestTarget', () => {
  const pointer = { x: 10, y: 20 }
  const radius = 24

  it('keeps the pointer position when no target is within the snap radius', () => {
    const targets = [{ x: 34.01, y: 20, heading: 90 }]
    expect(snapToNearestTarget(pointer, targets, radius)).toEqual({ pos: pointer, target: null })
  })

  it('snaps to a target on the snap radius boundary', () => {
    const target = { x: 34, y: 20, heading: 90 }
    expect(snapToNearestTarget(pointer, [target], radius)).toEqual({ pos: { x: 34, y: 20 }, target })
  })

  it('uses the nearest target', () => {
    const nearest = { x: 14, y: 24, heading: 0 }
    const farther = { x: 30, y: 20, heading: 180 }
    expect(snapToNearestTarget(pointer, [farther, nearest], radius)).toEqual({
      pos: { x: nearest.x, y: nearest.y },
      target: nearest
    })
  })

  it('uses the first target when distances are equal', () => {
    const first = { x: 2, y: 20, heading: null }
    const second = { x: 18, y: 20, heading: 45 }
    expect(snapToNearestTarget(pointer, [first, second], radius).target).toBe(first)
  })
})

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
