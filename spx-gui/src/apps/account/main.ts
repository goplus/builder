import '@/polyfills'
import '@/app.css'

import { createApp } from 'vue'
import { initDayjs } from '@/setup/dayjs'
import { initI18n } from '@/setup/i18n'
import { initSentry } from '@/setup/sentry'

import * as env from './env'
import App from './App.vue'
import router from './router'

// Account Web shares Sentry and i18n initialization with XBuilder, but does not
// need XBuilder-specific plugins such as VueKonva, VueQuery, Radar, or Spotlight.

initDayjs()

const app = createApp(App)
initSentry(app, router, env.sentry)
initI18n(app, env.defaultLang)
app.use(router)
app.mount('#app')
