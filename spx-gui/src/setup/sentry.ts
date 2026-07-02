import type { App as VueApp } from 'vue'
import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'

import { isCodeEditorOperation, isLSPOperation } from '@/utils/tracing'

const ignoreErrorTypes = [
  'AbortError',
  'Cancelled' // See `src/utils/exception` for details
]

function shouldIgnoreSentryException({ type = '', value: message = '' }: Sentry.Exception) {
  return ignoreErrorTypes.some((errorType) => type === errorType || message.includes(errorType + ':'))
}

export type SentryConfig = {
  dsn: string
  tracesSampleRate: number
  lspSampleRate: number
}

export function initSentry(app: VueApp<Element>, router: Router | undefined, config: SentryConfig) {
  if (process.env.NODE_ENV === 'development') return
  Sentry.init({
    app,
    dsn: config.dsn,
    integrations: [
      Sentry.browserTracingIntegration({
        router,
        routeLabel: 'path',
        shouldCreateSpanForRequest(url) {
          // We use data URLs for inlineable file, see details in `src/models/common/cloud.ts`.
          // Ignore them to avoid exceeding event size limits.
          if (url.startsWith('data:')) return false
          return true
        },
        finalTimeout: 30000, // Same as default, but make it explicit
        childSpanTimeout: 30000 // Keep child span timeout in sync with final timeout to maximize chance of collecting span data
      })
    ],
    environment: process.env.NODE_ENV,
    tracesSampler: (samplingContext) => {
      const { name, inheritOrSampleWith } = samplingContext
      if (isLSPOperation(name) || isCodeEditorOperation(name)) {
        return config.lspSampleRate
      }
      return inheritOrSampleWith(config.tracesSampleRate)
    },
    beforeSend(event) {
      if (event.level === 'error' && event.exception?.values != null && event.exception.values.length >= 1) {
        const filteredExceptions = event.exception.values.filter((ex) => !shouldIgnoreSentryException(ex))
        if (filteredExceptions.length === 0) return null
        event.exception.values = filteredExceptions
      }
      return event
    }
  })
}
