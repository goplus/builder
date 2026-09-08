import * as Sentry from '@sentry/vue'
import { RPCError, type RPCHandler } from './rpc'

const operationStartMethod = 'telemetry/operation.start'
const operationFinishMethod = 'telemetry/operation.finish'

type TraceAttributeValue = string | number | boolean
type TraceAttributes = Record<string, TraceAttributeValue>

type OperationState = {
  span: Sentry.Span
}

export type SentryTraceAPI = Pick<typeof Sentry, 'getTraceData' | 'startInactiveSpan' | 'startNewTrace'>

/**
 * Creates an RPC handler that maps telemetry/operation.start and
 * telemetry/operation.finish to Sentry spans.
 *
 * Each operation creates an independent root trace (via startNewTrace) so
 * HTTP attempts never accidentally inherit the pageload span. The first
 * phase does not support parent operations or error recording — attempts only
 * set their terminal status and end the span.
 */
export function createSentryTelemetryAdapter(sentry: SentryTraceAPI = Sentry): RPCHandler {
  const operations = new Map<string, OperationState>()
  let closed = false

  const endOperation = (operationID: string, endTime?: Date) => {
    const state = operations.get(operationID)
    if (state == null) return
    operations.delete(operationID)
    try {
      state.span.end(endTime)
    } catch {
      // Sentry cleanup is best effort.
    }
  }

  const startOperation = (params: unknown, signal: AbortSignal) => {
    if (signal.aborted || closed) throw new RPCError(-32603, 'JSON-RPC internal error')
    const input = asRecord(params)
    const name = requiredString(input, 'name')
    const operation = requiredString(input, 'operation')
    const attributes = traceAttributes(input.attributes)
    const startTime = optionalUnixTime(input, 'startTimeUnixMilli')

    // Every HTTP attempt is an independent root trace.
    const span = sentry.startNewTrace(() =>
      sentry.startInactiveSpan({
        name,
        op: operation,
        forceTransaction: true,
        parentSpan: null,
        attributes,
        startTime
      })
    )

    const operationID = span.spanContext().spanId
    operations.set(operationID, { span })
    signal.addEventListener('abort', () => endOperation(operationID), { once: true })

    try {
      const headers: Record<string, string> = {}
      if (input.propagation === 'http') {
        const traceData = sentry.getTraceData({ span })
        if (traceData['sentry-trace'] != null) headers['Sentry-Trace'] = traceData['sentry-trace']
        if (traceData.baggage != null) headers.Baggage = traceData.baggage
      }
      return { operationId: operationID, propagationHeaders: headers }
    } catch (error) {
      endOperation(operationID)
      throw error
    }
  }

  const finishOperation = (params: unknown) => {
    const input = asRecord(params)
    const operationID = requiredString(input, 'operationId')
    const state = operations.get(operationID)
    if (state == null) return // Late or duplicate finish — safe to ignore.
    const attributes = traceAttributes(input.attributes)
    const endTime = optionalUnixTime(input, 'endTimeUnixMilli')
    setSpanAttributes(state.span, attributes)
    if (input.status === 'ok') state.span.setStatus({ code: 1 })
    else if (input.status === 'error') state.span.setStatus({ code: 2 })
    else if (input.status === 'cancelled') state.span.setStatus({ code: 2, message: 'cancelled' })
    endOperation(operationID, endTime)
  }

  return {
    handle(method, params, signal) {
      if (closed) throw new RPCError(-32603, 'JSON-RPC internal error')
      switch (method) {
        case operationStartMethod:
          return startOperation(params, signal)
        case operationFinishMethod:
          finishOperation(params)
          return null
        default:
          throw new RPCError(-32601, 'JSON-RPC method not found')
      }
    },
    close() {
      if (closed) return
      closed = true
      for (const operationID of [...operations.keys()].reverse()) endOperation(operationID)
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RPCError(-32602, 'JSON-RPC invalid params')
  }
  return value as Record<string, unknown>
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value === '') throw new RPCError(-32602, 'JSON-RPC invalid params')
  return value
}

function optionalUnixTime(record: Record<string, unknown>, key: string): Date | undefined {
  const value = record[key]
  if (value == null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RPCError(-32602, 'JSON-RPC invalid params')
  }
  return new Date(value)
}

function traceAttributes(value: unknown): TraceAttributes {
  if (value == null) return {}
  const input = asRecord(value)
  const attributes: TraceAttributes = {}
  for (const [key, attribute] of Object.entries(input)) {
    if (typeof attribute === 'string' || typeof attribute === 'number' || typeof attribute === 'boolean') {
      attributes[key] = attribute
    }
  }
  return attributes
}

function setSpanAttributes(span: Sentry.Span, attributes: TraceAttributes) {
  for (const [key, value] of Object.entries(attributes)) span.setAttribute(key, value)
}
