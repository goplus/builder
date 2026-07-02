import { watchEffect, type App as VueApp } from 'vue'

import type { Config as UIConfig } from '@/components/ui'
import { createI18n, type I18n, normalizeLang } from '@/utils/i18n'

const langLocalStorageKey = 'spx-gui-language'

export function initI18n(app: VueApp, defaultLang: string) {
  const lang = localStorage.getItem(langLocalStorageKey) ?? defaultLang
  const i18n = createI18n({ lang: normalizeLang(lang) })
  const stop = watchEffect(() => {
    localStorage.setItem(langLocalStorageKey, i18n.lang.value)
  })
  app.onUnmount(stop)
  app.use(i18n)
}

/** Get config for UI components, with i18n support. */
export function getUIConfig(i18n: I18n): UIConfig {
  return {
    confirmDialog: {
      cancelText: i18n.t({ en: 'Cancel', zh: '取消' }),
      confirmText: i18n.t({ en: 'Confirm', zh: '确认' })
    },
    empty: {
      text: i18n.t({ en: 'No data', zh: '没有结果' })
    },
    error: {
      retryText: i18n.t({ en: 'Retry', zh: '重试' }),
      backText: i18n.t({ en: 'Back', zh: '返回' })
    }
  }
}
