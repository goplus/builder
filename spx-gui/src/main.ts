/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-16 11:08:56
 * @FilePath: /builder/spx-gui/src/main.ts
 * @Description:
 */
import { createApp } from "vue";
import App from "./App.vue";

import Loading from "@/components/loading/Loading.vue"
import { initAssets,initCodeEditor } from './plugins';
import { initRouter } from "@/router/index.ts";
import { initStore } from "./store";
async function initApp() {
    // Give priority to loading css,js resources
    initAssets()

    const loading = createApp(Loading);
    loading.mount('#appLoading');

    const app = createApp(App);
    initStore(app);
    await initRouter(app);
    initCodeEditor();

    loading.unmount()
    app.mount('#app')
}
initApp()