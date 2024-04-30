import { effect, type App } from 'vue'
import { createI18n, type Lang } from './utils/i18n'

const LOCALSTORAGE_KEY_LANGUAGE = 'spx-gui-language'

export const initI18n = async (app: App) => {
  const currentLanguage = (localStorage.getItem(LOCALSTORAGE_KEY_LANGUAGE) || 'en') as Lang
  const i18n = createI18n({ lang: currentLanguage })

  effect(() => {
    // TODO: what is the proper way for plugin to clean up?
    localStorage.setItem(LOCALSTORAGE_KEY_LANGUAGE, i18n.lang.value)
  })
  app.use(i18n)
}
