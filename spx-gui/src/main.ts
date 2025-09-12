import './polyfills'
import { createApp, type App as VueApp } from 'vue'
import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/zh'

import { initI18n } from './i18n'
import App from './App.vue'
import { initRouter } from './router'
import { initUserState, ensureAccessToken } from './stores/user'
import { setTokenProvider } from './apis/common'
import { CustomTransformer } from './components/editor/common/viewer/custom-transformer'
import { initDeveloperMode } from './utils/developer-mode'
import { isCodeEditorOperation, isLSPOperation } from './utils/tracing'
import { sentryDsn, sentryTracesSampleRate, sentryLSPSampleRate } from './utils/env'
import { createRadar } from './utils/radar'
import { createSpotlight } from './utils/spotlight'
import { createAppState } from './utils/app-state'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

function initApiClient() {
  setTokenProvider(ensureAccessToken)
}

function initSentry(app: VueApp<Element>, router: Router) {
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
        }
      })
    ],
    environment: process.env.NODE_ENV,
    tracesSampler: (samplingContext) => {
      const { name, inheritOrSampleWith } = samplingContext
      if (isLSPOperation(name) || isCodeEditorOperation(name)) {
        return sentryLSPSampleRate
      }
      return inheritOrSampleWith(sentryTracesSampleRate)
    }
  })
}

async function initApp() {
  const app = createApp(App)

  initUserState()
  const router = initRouter(app)
  initSentry(app, router)
  initApiClient()
  initI18n(app)
  initDeveloperMode()
  app.use(VueKonva as any, {
    customNodes: { CustomTransformer }
  })
  app.use(VueQueryPlugin)
  app.use(createRadar())
  app.use(createSpotlight())
  app.use(createAppState())

  app.mount('#app')
}

initApp()
