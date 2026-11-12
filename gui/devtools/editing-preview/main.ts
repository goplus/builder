import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import { createAppState } from '@/utils/app-state'
import { createI18n } from '@/utils/i18n'
import { createRadar } from '@/utils/radar'
import { initSignedIn } from '@/stores/user'
import Preview from './Preview.vue'
import '@/app.css'

if (!import.meta.env.DEV) throw new Error('The editing preview is available only in the development server')

const app = createApp(Preview)
  .use(createAppState())
  .use(createI18n({ lang: 'zh' }))
  .use(createRadar())
  .use(VueQueryPlugin)

// The editor uses the identity store for local preferences. No backend clients are configured here.
initSignedIn(app, { oauthClientId: 'editing-preview' })
app.mount('#app')
