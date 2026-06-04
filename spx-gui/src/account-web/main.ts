import '@/polyfills'
import '@/app.css'

import { createApp, watchEffect } from 'vue'

import { createI18n, normalizeLang } from '@/utils/i18n'
import { defaultLang } from '@/utils/env'

import App from './App.vue'
import router from './router'

const langLocalStorageKey = 'spx-gui-language'
const lang = normalizeLang(localStorage.getItem(langLocalStorageKey) ?? defaultLang)
const i18n = createI18n({ lang })

watchEffect(() => {
  localStorage.setItem(langLocalStorageKey, i18n.lang.value)
})

createApp(App).use(i18n).use(router).mount('#app')
