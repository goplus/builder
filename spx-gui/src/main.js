
import { createApp } from 'vue'
import App from './App.vue'
import { initAssets } from './plugins';
import { initRouter } from "@/router";
import { initStore } from '@/store';
import Loading from "@/components/loading/Loading.vue"
async function initApp() {
    // Give priority to loading css,js resources
    initAssets()

    const loading = createApp(Loading);
    loading.mount('#appLoading');
    
    const app = createApp(App);
    initStore(app);
    await initRouter(app);

    loading.unmount()
    app.mount('#app')
}
initApp()

