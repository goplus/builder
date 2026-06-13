import type { App as VueApp } from 'vue'
import type { Router } from 'vue-router'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { setWasmUrl as setDotLottieWasmUrl } from '@lottiefiles/dotlottie-vue'

import { client } from '@/apis/common'
import { CustomTransformer } from '@/components/editor/common/viewer/custom-transformer'
import { ensureAccessToken, initUserState } from '@/stores/user'
import { createAppState } from '@/utils/app-state'
import { initDeveloperMode } from '@/utils/developer-mode'
import { createRadar } from '@/utils/radar'
import { createSpotlight } from '@/utils/spotlight'

import { initDayjs } from './dayjs'
import { initI18n } from './i18n'
import { initSentry } from './sentry'

export { getUIConfig } from './i18n'

function initDotLottie() {
  const dotLottiePlayerWasmUrl = new URL('@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm', import.meta.url).href
  setDotLottieWasmUrl(dotLottiePlayerWasmUrl)
}

function initApiClient() {
  client.setTokenProvider(ensureAccessToken)
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
