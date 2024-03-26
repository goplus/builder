/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 14:38:25
 * @FilePath: \spx-gui\src\main.ts
 * @Description:
 */
import { createApp } from 'vue'
import VueKonva from 'vue-konva'

import 'vfonts/Lato.css' // TODO: what is this for?
import 'vfonts/FiraCode.css'

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

  app.mount('#app')
}
initApp()
