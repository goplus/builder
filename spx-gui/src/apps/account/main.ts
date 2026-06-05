import '@/polyfills'
import '@/app.css'

import { createApp, watchEffect } from 'vue'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { createI18n, normalizeLang } from '@/utils/i18n'
import { defaultLang } from '@/utils/env'

import App from './App.vue'
import router from './router'

function initDayjs() {
  dayjs.extend(localizedFormat)
  dayjs.extend(relativeTime)
  dayjs.extend(utc)
  dayjs.extend(timezone)
}
initDayjs()

const langLocalStorageKey = 'spx-gui-language'
const lang = normalizeLang(localStorage.getItem(langLocalStorageKey) ?? defaultLang)
const i18n = createI18n({ lang })

watchEffect(() => {
  localStorage.setItem(langLocalStorageKey, i18n.lang.value)
})

createApp(App).use(i18n).use(router).mount('#app')
