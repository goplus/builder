import * as Sentry from '@sentry/vue'

export type TraceStatus = 'ok' | 'error' | 'cancelled'

export type TraceStartInput = {
  name: string
  operation: string
}

export type TraceOperation = {
  propagationHeaders: Record<string, string>
  finish(status: TraceStatus): void
}

export type TraceHook = (input: TraceStartInput) => TraceOperation | null

export type TraceHookController = {
  hook: TraceHook
  close(): void
}

export type SentryTraceAPI = Pick<typeof Sentry, 'getTraceData' | 'startInactiveSpan' | 'startNewTrace'>

export function createSentryTraceHook(sentry: SentryTraceAPI = Sentry): TraceHookController {
  const active = new Set<(status: TraceStatus) => void>()
  let closed = false

  const hook: TraceHook = ({ name, operation }) => {
    if (closed) return null

    try {
      const span = sentry.startNewTrace(() =>
        sentry.startInactiveSpan({
          name,
          op: operation,
          forceTransaction: true,
          parentSpan: null
        })
      )

      let finished = false

      const finish = (status: TraceStatus) => {
        if (finished) return
        finished = true
        active.delete(finish)

        try {
          if (status === 'ok') {
            span.setStatus({ code: 1 })
          } else if (status === 'cancelled') {
            span.setStatus({ code: 2, message: 'cancelled' })
          } else {
            span.setStatus({ code: 2 })
          }
        } catch {
          // Setting status is best effort; still try to end the span below.
        }
        try {
          span.end()
        } catch {
          // Sentry cleanup must not affect the game.
        }
      }

      active.add(finish)

      try {
        const traceData = sentry.getTraceData({ span })
        const propagationHeaders: Record<string, string> = {}

        if (traceData['sentry-trace'] != null) {
          propagationHeaders['Sentry-Trace'] = traceData['sentry-trace']
        }
        if (traceData.baggage != null) {
          propagationHeaders.Baggage = traceData.baggage
        }

        return {
          propagationHeaders,
          finish
        }
      } catch {
        finish('error')
        return null
      }
    } catch {
      return null
    }
  }

  return {
    hook,
    close() {
      if (closed) return
      closed = true

      for (const finish of [...active]) {
        finish('cancelled')
      }
    }
  }
}
