/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 14:11:09
 * @FilePath: /builder/spx-gui/src/main.ts
 * @Description:
 */
import { createApp } from "vue";
import App from "./App.vue";

import Loading from "@/components/loading/Loading.vue"
import { initAssets,initCodeEditor } from './plugins';
import { initRouter } from "@/router/index.ts";
import { initStore } from "./store";
import { initI18n } from "@/language";

async function initApp() {
    

    const loading = createApp(Loading);
    loading.mount('#appLoading');
    

    // Give priority to loading css,js resources
    initAssets()





    const app = createApp(App);
    await initStore(app);
    await initRouter(app);
    await initCodeEditor();

    await initI18n(app);

    loading.unmount()
    app.mount('#app')
}
initApp()
