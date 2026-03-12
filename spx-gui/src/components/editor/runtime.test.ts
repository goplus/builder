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
  it('should keep latest outputs within default max size and assign stable ids', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    for (let i = 0; i < Runtime.defaultMaxOutputs + 1; i++) {
      appendLog(runtime, `output-${i}`)
    }
    flushOutputs()

    expect(runtime.outputs.length).toBe(Runtime.defaultMaxOutputs)
    expect(runtime.outputs[0].message).toBe('output-1')
    expect(runtime.outputs.at(-1)?.message).toBe(`output-${Runtime.defaultMaxOutputs}`)
    expect(runtime.outputs[0].id).toBe(1)
    expect(runtime.outputs.at(-1)?.id).toBe(Runtime.defaultMaxOutputs)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should expose fixed default max outputs', () => {
    const runtime = makeRuntime()
    expect(runtime.maxOutputs).toBe(Runtime.defaultMaxOutputs)
  })

  it('should keep output order after ring wraps', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    for (let i = 0; i < Runtime.defaultMaxOutputs + 3; i++) {
      appendLog(runtime, `output-${i}`)
    }
    flushOutputs()
    expect(runtime.outputs.length).toBe(Runtime.defaultMaxOutputs)
    expect(runtime.outputs[0].message).toBe('output-3')
    expect(runtime.outputs.at(-1)?.message).toBe(`output-${Runtime.defaultMaxOutputs + 2}`)
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

  it('should throttle didChangeOutput for addOutput and keep clear immediate', () => {
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

    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})
