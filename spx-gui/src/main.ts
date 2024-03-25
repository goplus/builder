/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 14:38:25
 * @FilePath: \spx-gui\src\main.ts
 * @Description:
 */
import { createApp } from 'vue'
import App from './App.vue'
import { initAssets, initCodeEditor } from './plugins'
import { initRouter } from '@/router/index'
import { initI18n } from '@/language'
import VueKonva from 'vue-konva'
import { initStore, useUserStore } from './store'
import { client } from './api/common'

const initServive = async () => {
  const userStore = useUserStore()
  client.setAuthProvider(userStore.getFreshAccessToken)
}

async function initApp() {
  // const loading = createApp(Loading);
  // loading.mount('#appLoading');

  // Give priority to loading css,js resources
  initAssets()

  const app = createApp(App)

  initStore(app)
  initServive()
  await initRouter(app)
  await initCodeEditor()

  await initI18n(app)

  app.use(VueKonva)

  app.mount('#app')
}
initApp()
