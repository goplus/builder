import './polyfills'
import './app.css'
import { createApp } from 'vue'
import { setup, configureApp } from './setup'
import App from './App.vue'

setup()
const app = createApp(App)
configureApp(app)
app.mount('#app')
