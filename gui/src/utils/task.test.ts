import { describe, it, expect } from 'vitest'
import { TaskManager } from './task'
import { timeout } from './utils'

describe('TaskManager', () => {
  it('should work well', async () => {
    const tm = new TaskManager(async (_, i: number) => {
      await timeout(100)
      return i * 10
    })

    expect(tm.result).toEqual({ data: null, error: null })

    await tm.start(1)
    expect(tm.result).toEqual({ data: 10, error: null })

    const p2 = tm.start(2)
    expect(tm.result).toEqual({ data: null, error: null })
    await p2
    expect(tm.result).toEqual({ data: 20, error: null })
  })

  it('should stop correctly', async () => {
    const signals: AbortSignal[] = []
    const tm = new TaskManager(async (signal, i: number) => {
      signals.push(signal)
      await timeout(100)
      signal.throwIfAborted()
      if (i === 2) throw new Error('Test error')
      return i * 10
    })

    const p1 = tm.start(1)
    tm.stop()
    expect(tm.result).toEqual({ data: null, error: null })
    await p1
    expect(tm.result).toEqual({ data: null, error: null })
    expect(signals.length).toBe(1)
    expect(signals[0].aborted).toBe(true)

    const p2 = tm.start(2)
    tm.stop()
    expect(tm.result).toEqual({ data: null, error: null })
    await p2
    expect(tm.result).toEqual({ data: null, error: null })
  })

  it('should handle errors', async () => {
    const testErr = new Error('Test error')
    const tm = new TaskManager(async (_, i: number) => {
      await timeout(100)
      if (i === 2) throw testErr
      return i * 10
    })

    expect(tm.result).toEqual({ data: null, error: null })

    await tm.start(1)
    expect(tm.result).toEqual({ data: 10, error: null })

    await tm.start(2)
    expect(tm.result).toEqual({ data: null, error: testErr })

    const p3 = tm.start(3)
    expect(tm.result).toEqual({ data: null, error: null })
    await p3
    expect(tm.result).toEqual({ data: 30, error: null })
  })

  it('should work well with concurrent tasks', async () => {
    const signals: AbortSignal[] = []
    const tm = new TaskManager(async (signal, i: number) => {
      signals.push(signal)
      await timeout(Math.random() * 200 + 100)
      signal.throwIfAborted()
      return i * 10
    })

    const p1 = tm.start(1)
    const p2 = tm.start(2)
    const p3 = tm.start(3)
    const p4 = tm.start(4)
    const p5 = tm.start(5)
    expect(tm.result).toEqual({ data: null, error: null })
    await Promise.all([p1, p2, p3, p4, p5])
    expect(tm.result).toEqual({ data: 50, error: null })
    expect(signals.length).toBe(5)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(true)
    expect(signals[2].aborted).toBe(true)
    expect(signals[3].aborted).toBe(true)
    expect(signals[4].aborted).toBe(false)
  })

  it('should work well with peserveData: true', async () => {
    const testErr = new Error('Test error')
    const tm = new TaskManager(async (_, i: number) => {
      await timeout(100)
      if (i === 2) throw testErr
      return i * 10
    }, true)

    expect(tm.result).toEqual({ data: null, error: null })

    await tm.start(1)
    expect(tm.result).toEqual({ data: 10, error: null })

    const p2 = tm.start(2)
    expect(tm.result).toEqual({ data: 10, error: null })
    await p2
    expect(tm.result).toEqual({ data: null, error: testErr })

    const p3 = tm.start(3)
    expect(tm.result).toEqual({ data: null, error: null })
    await p3
    expect(tm.result).toEqual({ data: 30, error: null })
  })
})
