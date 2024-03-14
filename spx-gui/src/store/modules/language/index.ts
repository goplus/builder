/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:29:52
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-01-18 01:29:52
 * @FilePath: src/store/modules/language/index.ts
 * @Description: language config store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLanguageStore = defineStore(
  'language',
  () => {
    const language = ref('en')
    const setLanguage = (_language: string) => {
      language.value = _language
    }
    const getLanguage = () => language.value
    return {
      //  state
      language: language,
      //  actions
      setLanguage,
      getLanguage
    }
  },
  {
    persist: true
  }
)
