/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 09:16:18
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 08:53:10
 * @FilePath: /builder/spx-gui/src/store/index.ts
 * @Description: 
 */
import { createPinia, defineStore } from "pinia"
import { type App } from "vue";
import piniaPluginPersist from "pinia-plugin-persist";

export const initStore = async (app: App)=> {
    const store = createPinia();
    store.use(piniaPluginPersist)
    app.use(store);
}

export * from './modules';

