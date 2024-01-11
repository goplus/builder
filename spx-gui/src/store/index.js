import { createPinia } from "pinia"

export function initStore(app) {
    const store = createPinia();
    app.use(store);
}

export * from './modules';

