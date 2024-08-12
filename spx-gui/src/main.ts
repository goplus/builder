import { createApp } from 'vue'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'

import { initI18n } from './i18n'
import App from './App.vue'
import { initRouter } from './router'
import { initStore, useUserStore } from './stores'
import { client } from './apis/common'
import { Transformer } from './components/editor/preview/stage-viewer/transformer/transformer'

const initApiClient = async () => {
  const userStore = useUserStore()
  client.setAuthProvider(userStore.getFreshAccessToken)
}

async function initApp() {
  const app = createApp(App)

  initStore(app)
  initApiClient()
  await initRouter(app)
  await initI18n(app)

  app.use(VueKonva as any, {
    customNodes: { CustomTransformer: Transformer }
  })

  app.use(VueQueryPlugin)

  app.mount('#app')
}

initApp()
