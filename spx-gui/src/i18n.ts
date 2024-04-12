/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 15:25:17
 * @FilePath: \spx-gui\src\language\index.ts
 * @Description:
 */
import type { App } from 'vue'
import { createI18n, useI18n, type Lang } from './utils/i18n'

const LOCALSTORAGE_KEY_LANGUAGE = 'spx-gui-language'

export const initI18n = async (app: App) => {
  const currentLanguage = (localStorage.getItem(LOCALSTORAGE_KEY_LANGUAGE) || 'en') as Lang
  localStorage.setItem(LOCALSTORAGE_KEY_LANGUAGE, currentLanguage)

  app.use(
    createI18n({
      lang: currentLanguage
    })
  )
}

export const useToggleLanguage = () => {
  const myI18n = useI18n()
  return () => {
    const lang = (localStorage.getItem(LOCALSTORAGE_KEY_LANGUAGE) as Lang) === 'en' ? 'zh' : 'en'
    myI18n.setLang(lang)
    localStorage.setItem(LOCALSTORAGE_KEY_LANGUAGE, lang)
  }
}
