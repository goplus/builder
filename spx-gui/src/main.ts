/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-25 14:21:02
 * @FilePath: /builder/spx-gui/src/main.ts
 * @Description:
 */
import { createApp } from 'vue'
import App from './App.vue'

import { initAssets, initCodeEditor } from './plugins'
import { initRouter } from '@/router/index'
import { initI18n } from '@/language'

import { addFileUrl } from './util/file'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { initStore } from './store'

async function initApp() {
  // const loading = createApp(Loading);
  // loading.mount('#appLoading');

  // Give priority to loading css,js resources
  initAssets()
  addFileUrl()

  const app = createApp(App)

  initStore(app)

  await initRouter(app)
  await initCodeEditor()

  await initI18n(app)

  app.use(VueKonva)
  app.use(VueQueryPlugin)

  app.mount('#app')
}
initApp()
