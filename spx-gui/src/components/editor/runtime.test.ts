import { afterEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('emits every output immediately independently of snapshot retention and clearing', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()
    const appended: RuntimeOutput[] = []
    const snapshotChanged = vi.fn()
    runtime.on('didAppendOutput', (output) => appended.push(output))
    runtime.on('didChangeOutputSnapshot', snapshotChanged)
    const count = Runtime.defaultMaxOutputs + 100
    for (let i = 0; i < count; i++) {
      appendLog(runtime, `output-${i}`)
      expect(appended.length).toBe(i + 1)
    }
    const error = { kind: RuntimeOutputKind.Error, time: 123, message: 'error' }
    runtime.addOutput(error)
    expect(appended.map(({ id, message }) => ({ id, message }))).toEqual([
      ...Array.from({ length: count }, (_, id) => ({ id, message: `output-${id}` })),
      { id: count, message: 'error' }
    ])
    expect(appended.at(-1)).toEqual({ ...error, id: count })
    expect(runtime.outputSnapshot).toEqual([])
    expect(snapshotChanged).not.toHaveBeenCalled()

    flushOutputs()
    expect(runtime.outputSnapshot).toEqual(appended.slice(-Runtime.defaultMaxOutputs))
    expect(snapshotChanged).toHaveBeenCalledOnce()
    runtime.clearOutputs()
    appendLog(runtime, 'after-clear')
    runtime.clearOutputs()
    flushOutputs()
    expect(appended.at(-1)).toMatchObject({ id: count + 1, message: 'after-clear' })
    expect(appended).toHaveLength(count + 2)
    expect(runtime.outputSnapshot).toEqual([])
    runtime.dispose()
  })

  it('reports location changes and rejects delayed locations after exit', () => {
    const runtime = makeRuntime()
    const events: Array<number | null> = []
    runtime.on('didChangeLocation', () => events.push(runtime.location?.line ?? null))
    runtime.setRunning({ mode: 'debug', initializing: true })
    runtime.beginLocationTracking()
    const location = (line: number) => ({
      textDocument: { uri: 'file:///Sprite.spx' },
      line
    })

    runtime.setLocation(location(1))
    runtime.setLocation(location(2))
    expect(events).toEqual([1, 2])

    runtime.setLocation(location(3))
    runtime.setRunning({ mode: 'none' })
    expect(events).toEqual([1, 2, 3, null])

    runtime.setRunning({ mode: 'debug', initializing: true })
    runtime.beginLocationTracking()
    runtime.setLocation(location(4))
    runtime.invalidateLocation()
    runtime.setLocation(location(5))
    expect(runtime.location).toBeNull()
    runtime.setRunning({ mode: 'debug', initializing: true })
    runtime.setLocation(location(6))
    expect(runtime.location).toBeNull()
    runtime.beginLocationTracking()
    runtime.setLocation(location(6))
    runtime.clearOutputs()
    expect(runtime.location).toBeNull()
    runtime.dispose()
  })

  it('should keep latest outputs within default max size and assign stable ids', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    for (let i = 0; i < Runtime.defaultMaxOutputs + 1; i++) {
      appendLog(runtime, `output-${i}`)
    }
    flushOutputs()

    expect(runtime.outputSnapshot.length).toBe(Runtime.defaultMaxOutputs)
    expect(runtime.outputSnapshot[0].message).toBe('output-1')
    expect(runtime.outputSnapshot.at(-1)?.message).toBe(`output-${Runtime.defaultMaxOutputs}`)
    expect(runtime.outputSnapshot[0].id).toBe(1)
    expect(runtime.outputSnapshot.at(-1)?.id).toBe(Runtime.defaultMaxOutputs)
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
    expect(runtime.outputSnapshot.length).toBe(Runtime.defaultMaxOutputs)
    expect(runtime.outputSnapshot[0].message).toBe('output-3')
    expect(runtime.outputSnapshot.at(-1)?.message).toBe(`output-${Runtime.defaultMaxOutputs + 2}`)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should expose output snapshot only after throttled flush for addOutput', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()

    appendLog(runtime, 'output-1')
    expect(runtime.outputSnapshot).toEqual([])

    flushOutputs()
    expect(runtime.outputSnapshot.map((item) => item.message)).toEqual(['output-1'])
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should throttle didChangeOutput for addOutput and keep clear immediate', () => {
    vi.useFakeTimers()
    withMockedAnimationFrame()
    const runtime = makeRuntime()
    let changeCount = 0
    runtime.on('didChangeOutputSnapshot', () => {
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
