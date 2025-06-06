import './polyfills'
import { createApp } from 'vue'
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
import { initUserStore, useUserStore } from './stores/user'
import { setTokenProvider } from './apis/common'
import { CustomTransformer } from './components/editor/preview/stage-viewer/custom-transformer'
import { initDeveloperMode } from './utils/developer-mode'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

const initApiClient = async () => {
  const userStore = useUserStore()
  setTokenProvider(userStore.ensureAccessToken)
}

async function initApp() {
  const app = createApp(App)

  initUserStore(app)
  initApiClient()
  initRouter(app)
  initI18n(app)
  initDeveloperMode()

  app.use(VueKonva as any, {
    customNodes: { CustomTransformer }
  })

  app.use(VueQueryPlugin)

  app.mount('#app')
}

initApp()
