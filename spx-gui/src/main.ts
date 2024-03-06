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
import { addFileUrl } from './util/file'
import VueKonva from 'vue-konva'
import { initStore, useUserStore } from './store'
import { serviceConstructor } from '@/axios'
import { createDiscreteApi } from 'naive-ui'

const { message } = createDiscreteApi(['message'])
const initServive = async () => {
  const userStore = useUserStore()
  serviceConstructor.setAccessTokenFn(userStore.getFreshAccessToken)
  serviceConstructor.setNotifyErrorFn((msg: string) => {
    message.error(msg)
  })
}

async function initApp() {
  // const loading = createApp(Loading);
  // loading.mount('#appLoading');

  // Give priority to loading css,js resources
  initAssets()
  addFileUrl()

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
