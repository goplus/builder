import { watchEffect, type App as VueApp } from 'vue'
import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { setWasmUrl as setDotLottieWasmUrl } from '@lottiefiles/dotlottie-vue'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/zh'

import { initUserState, ensureAccessToken } from './stores/user'
import { client } from './apis/common'
import { CustomTransformer } from './components/editor/common/viewer/custom-transformer'
import { initDeveloperMode } from './utils/developer-mode'
import { createI18n, I18n, normalizeLang } from './utils/i18n'
import { isCodeEditorOperation, isLSPOperation } from './utils/tracing'
import { sentryDsn, sentryTracesSampleRate, sentryLSPSampleRate, defaultLang } from './utils/env'
import { createRadar } from './utils/radar'
import { createSpotlight } from './utils/spotlight'
import { createAppState } from './utils/app-state'
import type { Config as UIConfig } from './components/ui'

function initDotLottie() {
  const dotLottiePlayerWasmUrl = new URL('@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm', import.meta.url).href
  setDotLottieWasmUrl(dotLottiePlayerWasmUrl)
}

function initDayjs() {
  dayjs.extend(localizedFormat)
  dayjs.extend(relativeTime)
  dayjs.extend(utc)
  dayjs.extend(timezone)
}

function initApiClient() {
  client.setTokenProvider(ensureAccessToken)
}

const ignoreErrorTypes = [
  'AbortError',
  'Cancelled' // See `src/utils/exception` for details
]

function shouldIgnoreSentryException({ type = '', value: message = '' }: Sentry.Exception) {
  return ignoreErrorTypes.some((errorType) => type === errorType || message.includes(errorType + ':'))
}

function initSentry(app: VueApp<Element>, router?: Router) {
  if (process.env.NODE_ENV === 'development') return
  Sentry.init({
    app,
    dsn: sentryDsn,
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
        return sentryLSPSampleRate
      }
      return inheritOrSampleWith(sentryTracesSampleRate)
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

const langLocalStorageKey = 'spx-gui-language'

function initI18n(app: VueApp) {
  const lang = localStorage.getItem(langLocalStorageKey) ?? defaultLang
  const i18n = createI18n({ lang: normalizeLang(lang) })
  const stop = watchEffect(() => {
    localStorage.setItem(langLocalStorageKey, i18n.lang.value)
  })
  app.onUnmount(stop)
  app.use(i18n)
}

/** Do general app setup, including shared library init and app-level global state/bootstrap side effects. */
export function setup() {
  initDotLottie()
  initDayjs()
  initApiClient()
  initUserState()
  initDeveloperMode()
}

/** Configure the Vue app by installing plugins, etc. */
export function configureApp(app: VueApp, router?: Router) {
  initSentry(app, router)
  initI18n(app)
  app.use(VueKonva as any, {
    customNodes: { CustomTransformer }
  })
  app.use(VueQueryPlugin)
  app.use(createRadar())
  app.use(createSpotlight())
  app.use(createAppState())
}

/** Get config for UI components, with i18n support. */
export function getUIConfig(i18n: I18n): UIConfig {
  return {
    confirmDialog: {
      cancelText: i18n.t({ en: 'Cancel', zh: '取消' }),
      confirmText: i18n.t({ en: 'Confirm', zh: '确认' })
    },
    empty: {
      text: i18n.t({ en: 'No data', zh: '没有结果' })
    },
    error: {
      retryText: i18n.t({ en: 'Retry', zh: '重试' }),
      backText: i18n.t({ en: 'Back', zh: '返回' })
    }
  }
}
