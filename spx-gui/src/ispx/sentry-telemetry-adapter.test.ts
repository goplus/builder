import { describe, expect, it } from 'vitest'
import { RPCError } from './rpc'
import { createSentryTelemetryAdapter, type SentryTraceAPI } from './sentry-telemetry-adapter'

type StartOptions = Parameters<SentryTraceAPI['startInactiveSpan']>[0]

class FakeSpan {
  readonly attributes: Record<string, unknown>
  status: unknown = null
  ended = false
  endTime: unknown = null

  constructor(
    readonly id: string,
    readonly options: StartOptions
  ) {
    this.attributes = { ...options.attributes }
  }

  spanContext() {
    return { spanId: this.id, traceId: 'trace-id', traceFlags: 1 }
  }

  setAttribute(key: string, value: unknown) {
    this.attributes[key] = value
    return this
  }

  setStatus(status: unknown) {
    this.status = status
    return this
  }

  end(endTime?: unknown) {
    this.ended = true
    this.endTime = endTime
  }
}

function createFakeSentry() {
  const spans: FakeSpan[] = []
  const api = {
    startNewTrace<T>(callback: () => T) {
      return callback()
    },
    startInactiveSpan(options: StartOptions) {
      const span = new FakeSpan(`span-${spans.length + 1}`, options)
      spans.push(span)
      return span
    },
    getTraceData({ span }: { span: FakeSpan }) {
      return {
        'sentry-trace': `trace-${span.id}`,
        baggage: `meta-${span.id}`
      }
    }
  } as unknown as SentryTraceAPI
  return { api, spans }
}

describe('createSentryTelemetryAdapter', () => {
  it('creates independent root traces and returns propagation headers', async () => {
    const { api, spans } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)
    const signal = new AbortController().signal

    const result = (await adapter.handle(
      'telemetry/operation.start',
      {
        name: 'POST /ai-interaction/turns',
        operation: 'http.client',
        startTimeUnixMilli: 1_700_000_000_000,
        propagation: 'http'
      },
      signal
    )) as { operationId: string; propagationHeaders: Record<string, string> }

    expect(result).toEqual({
      operationId: 'span-1',
      propagationHeaders: { 'Sentry-Trace': 'trace-span-1', Baggage: 'meta-span-1' }
    })
    expect(spans[0].options).toMatchObject({
      name: 'POST /ai-interaction/turns',
      op: 'http.client',
      forceTransaction: true,
      parentSpan: null,
      startTime: new Date(1_700_000_000_000)
    })
  })

  it('finishes operations with correct status', async () => {
    const { api, spans } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)
    const signal = new AbortController().signal

    const result = (await adapter.handle(
      'telemetry/operation.start',
      { name: 'POST /ai-interaction/turns', operation: 'http.client' },
      signal
    )) as { operationId: string }

    await adapter.handle(
      'telemetry/operation.finish',
      { operationId: result.operationId, status: 'error', endTimeUnixMilli: 1_700_000_000_100 },
      signal
    )

    expect(spans[0].status).toEqual({ code: 2 })
    expect(spans[0].ended).toBe(true)
    expect(spans[0].endTime).toEqual(new Date(1_700_000_000_100))
  })

  it('only returns propagation headers when explicitly requested', async () => {
    const { api } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)

    const result = await adapter.handle(
      'telemetry/operation.start',
      { name: 'background work', operation: 'task' },
      new AbortController().signal
    )

    expect(result).toMatchObject({ propagationHeaders: {} })
  })

  it('records cancelled operations without capturing an exception', async () => {
    const { api, spans } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)
    const signal = new AbortController().signal
    const result = (await adapter.handle(
      'telemetry/operation.start',
      { name: 'POST /ai-interaction/turns', operation: 'http.client' },
      signal
    )) as { operationId: string }

    await adapter.handle('telemetry/operation.finish', { operationId: result.operationId, status: 'cancelled' }, signal)

    expect(spans[0].status).toEqual({ code: 2, message: 'cancelled' })
    expect(spans[0].ended).toBe(true)
  })

  it('ignores duplicate or late finish calls', async () => {
    const { api, spans } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)
    const signal = new AbortController().signal

    const result = (await adapter.handle(
      'telemetry/operation.start',
      { name: 'POST /ai-interaction/turns', operation: 'http.client' },
      signal
    )) as { operationId: string }

    await adapter.handle('telemetry/operation.finish', { operationId: result.operationId, status: 'ok' }, signal)
    // Second finish should be silently ignored.
    await adapter.handle('telemetry/operation.finish', { operationId: result.operationId, status: 'error' }, signal)

    expect(spans[0].status).toEqual({ code: 1 }) // First status wins.
    expect(spans[0].ended).toBe(true)
  })

  it('ends remaining operations on cancellation and close', async () => {
    const { api, spans } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)
    const controller = new AbortController()

    await adapter.handle(
      'telemetry/operation.start',
      { name: 'POST /ai-interaction/turns', operation: 'http.client' },
      controller.signal
    )
    controller.abort()
    expect(spans[0].ended).toBe(true)

    await adapter.handle(
      'telemetry/operation.start',
      { name: 'POST /ai-interaction/archives', operation: 'http.client' },
      new AbortController().signal
    )
    adapter.close?.()
    adapter.close?.()
    expect(spans[1].ended).toBe(true)

    await expect(
      Promise.resolve().then(() =>
        adapter.handle(
          'telemetry/operation.start',
          { name: 'POST /ai-interaction/turns', operation: 'http.client' },
          new AbortController().signal
        )
      )
    ).rejects.toBeInstanceOf(RPCError)
  })

  it('rejects unknown methods', async () => {
    const { api } = createFakeSentry()
    const adapter = createSentryTelemetryAdapter(api)

    await expect(
      Promise.resolve().then(() =>
        adapter.handle('trace/span.start', { name: 'x', operation: 'x' }, new AbortController().signal)
      )
    ).rejects.toBeInstanceOf(RPCError)
  })
})
