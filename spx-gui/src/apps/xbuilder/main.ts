import '@/polyfills'
import '@/app.css'
import { createApp } from 'vue'
import { setupXBuilder, configureXBuilderApp } from './setup'
import { initRouter } from './router'
import App from './App.vue'

setupXBuilder()
const app = createApp(App)
const router = initRouter(app)
configureXBuilderApp(app, router)
app.mount('#app')
