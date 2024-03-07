/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 08:53:29
 * @FilePath: \spx-gui\src\store\modules\editor\index.ts
 * @Description:
 */
import { defineStore } from 'pinia'
import { monaco } from '@/components/code-editor'

export const useEditorStore = defineStore('editor', () => {
  /**
   * @description: trigger the insertion function
   * The code editor component is subscribed the event
   * @param {monaco.languages.CompletionItem} snippet
   * @return {*}
   * @author Zhang zhi yang
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insertSnippet = (snippet: monaco.languages.CompletionItem) => {
    // This function is notify code-editor component's insert Function
  }

  return {
    insertSnippet
  }
})
