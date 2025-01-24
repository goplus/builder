import { describe, it, expect } from 'vitest'
import { sampleCode } from './copilot'

describe('sampleCode', () => {
  it('should sample code correctly', () => {
    const lines = ['a', 'b', 'c', 'd', 'e']
    const ctx = { quota: 3 }
    expect(sampleCode(ctx, lines, 3)).toEqual([2, 4])
    expect(ctx.quota).toBe(0)
  })

  it('should maintain quota correctly', () => {
    const lines = ['a', 'b', 'c', 'd', 'e']
    const ctx = { quota: 10 }
    expect(sampleCode(ctx, lines, 3)).toEqual([1, 5])
    expect(ctx.quota).toBe(5)

    ctx.quota = 15
    expect(sampleCode(ctx, lines, 1)).toEqual([1, 5])
    expect(ctx.quota).toBe(10)
  })

  it('should sample code correctly with different `fromLine`', () => {
    const lines = ['a', 'b', 'c', 'd', 'e']
    expect(sampleCode({ quota: 3 }, lines, 1)).toEqual([1, 3])
    expect(sampleCode({ quota: 3 }, lines, 2)).toEqual([1, 3])
    expect(sampleCode({ quota: 4 }, lines, 5)).toEqual([2, 5])
    expect(sampleCode({ quota: 2 }, lines, 2)).toEqual([1, 2])
  })

  it('should sample code correctly with long lines', () => {
    const lines = ['aaa', 'bbbb', 'ccccc', 'dddd', 'eee']
    const ctx = { quota: 0 }

    ctx.quota = 3
    expect(sampleCode(ctx, lines, 3)).toEqual([3, 3])
    expect(ctx.quota).toBe(-2)

    ctx.quota = 5
    expect(sampleCode(ctx, lines, 3)).toEqual([3, 3])
    expect(ctx.quota).toBe(0)

    ctx.quota = 8
    expect(sampleCode(ctx, lines, 3)).toEqual([2, 3])
    expect(ctx.quota).toBe(-1)

    ctx.quota = 10
    expect(sampleCode(ctx, lines, 3)).toEqual([2, 4])
    expect(ctx.quota).toBe(-3)

    ctx.quota = 18
    expect(sampleCode(ctx, lines, 3)).toEqual([1, 5])
    expect(ctx.quota).toBe(-1)

    ctx.quota = 20
    expect(sampleCode(ctx, lines, 3)).toEqual([1, 5])
    expect(ctx.quota).toBe(1)

    ctx.quota = 18
    expect(sampleCode(ctx, lines, 1)).toEqual([1, 5])
    expect(ctx.quota).toBe(-1)

    ctx.quota = 20
    expect(sampleCode(ctx, lines, 5)).toEqual([1, 5])
    expect(ctx.quota).toBe(1)
  })
})
