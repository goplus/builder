import { createApp } from 'vue'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'

import { initI18n } from './i18n'
import App from './App.vue'
import { initRouter } from './router'
import { initStore, useUserStore } from './stores'
import { client } from './apis/common'

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

  app.use(VueKonva)

  app.use(VueQueryPlugin)

  app.mount('#app')
}

initApp()
