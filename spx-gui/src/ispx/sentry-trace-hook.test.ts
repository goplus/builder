import { describe, expect, it } from 'vitest'
import { createSentryTraceHook, type SentryTraceAPI, type TraceStatus } from './sentry-trace-hook'

type StartOptions = Parameters<SentryTraceAPI['startInactiveSpan']>[0]

class FakeSpan {
  status: unknown = null
  endCalls = 0
  throwOnSetStatus = false

  constructor(readonly options: StartOptions) {}

  spanContext() {
    return { spanId: 'span-id', traceId: 'trace-id', traceFlags: 1 }
  }

  setStatus(status: unknown) {
    if (this.throwOnSetStatus) throw new Error('setStatus failed')
    this.status = status
    return this
  }

  end() {
    this.endCalls++
  }
}

function createFakeSentry(options: { throwOnStart?: boolean; throwOnGetTraceData?: boolean } = {}) {
  const spans: FakeSpan[] = []
  const api = {
    startNewTrace<T>(callback: () => T) {
      return callback()
    },
    startInactiveSpan(startOptions: StartOptions) {
      if (options.throwOnStart) throw new Error('start failed')
      const span = new FakeSpan(startOptions)
      spans.push(span)
      return span
    },
    getTraceData() {
      if (options.throwOnGetTraceData) throw new Error('getTraceData failed')
      return {
        'sentry-trace': 'trace-value',
        baggage: 'baggage-value'
      }
    }
  } as unknown as SentryTraceAPI
  return { api, spans }
}

describe('createSentryTraceHook', () => {
  it('creates an independent root and returns propagation headers', () => {
    const { api, spans } = createFakeSentry()
    const controller = createSentryTraceHook(api)

    const operation = controller.hook({ name: 'POST /ai-interaction/turns', operation: 'http.client' })

    expect(operation?.propagationHeaders).toEqual({
      'Sentry-Trace': 'trace-value',
      Baggage: 'baggage-value'
    })
    expect(spans[0].options).toMatchObject({
      name: 'POST /ai-interaction/turns',
      op: 'http.client',
      forceTransaction: true,
      parentSpan: null
    })
  })

  it.each<[TraceStatus, unknown]>([
    ['ok', { code: 1 }],
    ['error', { code: 2 }],
    ['cancelled', { code: 2, message: 'cancelled' }]
  ])('maps %s to the expected span status', (status, expected) => {
    const { api, spans } = createFakeSentry()
    const operation = createSentryTraceHook(api).hook({ name: 'request', operation: 'http.client' })

    operation?.finish(status)

    expect(spans[0].status).toEqual(expected)
    expect(spans[0].endCalls).toBe(1)
  })

  it('finishes each operation once and cancels remaining operations on close', () => {
    const { api, spans } = createFakeSentry()
    const controller = createSentryTraceHook(api)
    const completed = controller.hook({ name: 'completed', operation: 'http.client' })
    const pending = controller.hook({ name: 'pending', operation: 'http.client' })

    completed?.finish('ok')
    completed?.finish('error')
    controller.close()
    controller.close()
    pending?.finish('error')

    expect(spans[0].status).toEqual({ code: 1 })
    expect(spans[0].endCalls).toBe(1)
    expect(spans[1].status).toEqual({ code: 2, message: 'cancelled' })
    expect(spans[1].endCalls).toBe(1)
    expect(controller.hook({ name: 'late', operation: 'http.client' })).toBeNull()
  })

  it('fails open when Sentry cannot start or propagate a trace', () => {
    const startFailure = createFakeSentry({ throwOnStart: true })
    expect(createSentryTraceHook(startFailure.api).hook({ name: 'request', operation: 'http.client' })).toBeNull()

    const propagationFailure = createFakeSentry({ throwOnGetTraceData: true })
    expect(createSentryTraceHook(propagationFailure.api).hook({ name: 'request', operation: 'http.client' })).toBeNull()
    expect(propagationFailure.spans[0].status).toEqual({ code: 2 })
    expect(propagationFailure.spans[0].endCalls).toBe(1)
  })

  it('still ends the span when setting its status fails', () => {
    const { api, spans } = createFakeSentry()
    const operation = createSentryTraceHook(api).hook({ name: 'request', operation: 'http.client' })
    spans[0].throwOnSetStatus = true

    operation?.finish('error')

    expect(spans[0].endCalls).toBe(1)
  })
})
