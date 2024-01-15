import { createPinia } from "pinia"
import { App } from "vue";
import piniaPluginPersist from "pinia-plugin-persist";

export function initStore(app: App) {
    const store = createPinia();
    store.use(piniaPluginPersist)
    app.use(store);
}

export * from './modules';

