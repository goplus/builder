import '@/polyfills'
import '@/app.css'
import { createApp } from 'vue'
import { setup, configureApp } from '@/setup'
import { initRouter } from './router'
import App from './App.vue'

setup()
const app = createApp(App)
const router = initRouter(app)
configureApp(app, router)
app.mount('#app')
