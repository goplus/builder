import type { App as VueApp } from 'vue'
import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'

import { isAIOperation, isCodeEditorOperation, isLSPOperation } from '@/utils/tracing'

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
  ispxSampleRate: number
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
          // AI requests create their own independent http.client transactions.
          // API base URLs vary between deployments and may or may not include /api.
          if (url.includes('/ai-interaction/turns') || url.includes('/ai-interaction/archives')) return false
          return true
        },
        finalTimeout: 30000, // Same as default, but make it explicit
        childSpanTimeout: 30000 // Keep child span timeout in sync with final timeout to maximize chance of collecting span data
      })
    ],
    environment: process.env.NODE_ENV,
    tracesSampler: (samplingContext) => {
      const { name, inheritOrSampleWith } = samplingContext
      // Independent iSPX roots must not inherit pageload sampling (#1826).
      if (isAIOperation(name)) {
        return config.ispxSampleRate
      }
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
