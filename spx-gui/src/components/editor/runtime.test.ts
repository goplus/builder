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

describe('Runtime', () => {
  it('should keep latest outputs within max size and assign stable ids', () => {
    const runtime = makeRuntime()
    runtime.setMaxOutputs(2)

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')

    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-2', 'output-3'])
    expect(runtime.outputs.map((item) => item.id)).toEqual([1, 2])
  })

  it('should trim existing outputs immediately after max size changes', () => {
    const runtime = makeRuntime()

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')
    appendLog(runtime, 'output-4')

    runtime.setMaxOutputs(3)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-2', 'output-3', 'output-4'])

    runtime.setMaxOutputs(2)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-3', 'output-4'])
  })

  it('should clamp max outputs to a safe upper bound', () => {
    const runtime = makeRuntime()

    runtime.setMaxOutputs(999_999_999)
    expect(runtime.maxOutputs).toBe(10_000)
  })

  it('should keep output order after ring wraps and max size changes', () => {
    const runtime = makeRuntime()
    runtime.setMaxOutputs(3)

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    appendLog(runtime, 'output-3')
    appendLog(runtime, 'output-4')
    appendLog(runtime, 'output-5')
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-3', 'output-4', 'output-5'])

    runtime.setMaxOutputs(2)
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-4', 'output-5'])

    runtime.setMaxOutputs(4)
    appendLog(runtime, 'output-6')
    expect(runtime.outputs.map((item) => item.message)).toEqual(['output-4', 'output-5', 'output-6'])
  })

  it('should throttle didChangeOutput for addOutput and keep clear/setMax immediate', () => {
    vi.useFakeTimers()
    const runtime = makeRuntime()
    let changeCount = 0
    runtime.on('didChangeOutput', () => {
      changeCount += 1
    })

    appendLog(runtime, 'output-1')
    appendLog(runtime, 'output-2')
    expect(changeCount).toBe(0)
    vi.advanceTimersByTime(Runtime.outputChangeEventThrottleMs)
    expect(changeCount).toBe(1)

    runtime.clearOutputs()
    expect(changeCount).toBe(2)

    appendLog(runtime, 'output-3')
    runtime.setMaxOutputs(500)
    expect(changeCount).toBe(3)

    vi.useRealTimers()
  })
})
