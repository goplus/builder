import { describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import { Runtime, RuntimeOutputKind } from './runtime'

function makeRuntime() {
  return new Runtime(new SpxProject())
}

function appendLog(runtime: Runtime, message: string) {
  runtime.addOutput({
    kind: RuntimeOutputKind.Log,
    time: Date.now(),
    message
  })
}

function flushOutputs() {
  vi.advanceTimersByTime(16)
}

function withMockedAnimationFrame() {
  let nextFrameId = 1
  const frameTimers = new Map<number, ReturnType<typeof setTimeout>>()

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const frameId = nextFrameId++
    const timerId = setTimeout(() => {
      frameTimers.delete(frameId)
      cb(performance.now())
    }, 16)
    frameTimers.set(frameId, timerId)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
    const timerId = frameTimers.get(frameId)
    if (timerId != null) {
      clearTimeout(timerId)
      frameTimers.delete(frameId)
    }
  })
}

describe('Runtime', () => {
  it('should keep latest outputs within max size and assign stable ids', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()
    runtime.setMaxOutputs(2)

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')
    flushOutputs()

    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-2', 'output-3'])
    expect(runtime.outputs.map((item) => item.id)).toEqual([1, 2])
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should trim existing outputs immediately after max size changes', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')
    appendLog(runtime, 'output-4')
    flushOutputs()

    runtime.setMaxOutputs(3)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-2', 'output-3', 'output-4'])

    runtime.setMaxOutputs(2)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-3', 'output-4'])
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should clamp max outputs to a safe upper bound', () => {
    const runtime = makeRuntime()

    runtime.setMaxOutputs(999_999_999)
    expect(runtime.maxOutputs).toBe(10_000)
  })

  it('should keep output order after ring wraps and max size changes', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()
    runtime.setMaxOutputs(3)

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')
    appendLog(runtime, 'output-4')
    appendLog(runtime, 'output-5')
    flushOutputs()
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-3', 'output-4', 'output-5'])

    runtime.setMaxOutputs(2)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-4', 'output-5'])

    runtime.setMaxOutputs(4)
    appendLog(runtime, 'output-6')
    flushOutputs()
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-4', 'output-5', 'output-6'])
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should expose output snapshot only after throttled flush for addOutput', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    appendLog(runtime, 'output-1')
    expect(runtime.outputs).toEqual([])

    flushOutputs()
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-1'])
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should throttle didChangeOutput for addOutput and keep clear/setMax immediate', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()
    let changeCount = 0
    runtime.on('didChangeOutput', () => {
      changeCount += 1
    })

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    expect(changeCount).toBe(0)
    flushOutputs()
    expect(changeCount).toBe(1)

    runtime.clearOutputs()
    expect(changeCount).toBe(2)

    appendLog(runtime, 'output-3')
    runtime.setMaxOutputs(200)
    expect(changeCount).toBe(3)

    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})
