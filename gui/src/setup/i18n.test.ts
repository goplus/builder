import { createApp, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { useI18n } from '@/utils/i18n'
import { initI18n } from './i18n'

describe('initI18n', () => {
  it.each([
    ['en', 'zh'],
    ['zh', 'en']
  ] as const)('syncs the document language for a site configured with %s', async (defaultLang, otherLang) => {
    const root = document.documentElement
    const previousLang = root.getAttribute('lang')
    const key = 'spx-gui-language'
    const previousPreference = localStorage.getItem(key)
    localStorage.setItem(key, otherLang)
    const app = createApp(() => null)
    initI18n(app, defaultLang)
    app.mount(document.createElement('div'))
    try {
      const i18n = app.runWithContext(useI18n)
      expect(root.lang).toBe(otherLang)
      i18n.setLang(defaultLang)
      await nextTick()
      expect(root.lang).toBe(defaultLang)
      i18n.setLang(otherLang)
      await nextTick()
      expect(root.lang).toBe(otherLang)
    } finally {
      app.unmount()
      if (previousLang == null) root.removeAttribute('lang')
      else root.lang = previousLang
      if (previousPreference == null) localStorage.removeItem(key)
      else localStorage.setItem(key, previousPreference)
    }
  })
})
