import { createPinia } from "pinia"
import { App } from "vue";
import piniaPluginPersist from "pinia-plugin-persist";

export const initStore = async (app: App)=> {
    const store = createPinia();
    store.use(piniaPluginPersist)
    app.use(store);
}

export * from './modules';

