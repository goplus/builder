/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 14:44:48
 * @FilePath: \spx-gui\src\store\modules\editor\index.ts
 * @Description:
 */
import { defineStore } from 'pinia'
import { monaco } from '@/components/code-editor'
import {computed, ref, watch} from 'vue'
import { useSpriteStore } from '@/store'
import {} from 'fs'
export enum EditContentType {
  Sprite = 1,
  EntryCode = 2
}
export const useEditorStore = defineStore('editor', () => {
  const spriteStore = useSpriteStore()
  const editContentType = ref<EditContentType>(EditContentType.Sprite)
  const readOnly = computed(() => spriteStore.current == null && editContentType.value != EditContentType.EntryCode)

  watch(
    () => spriteStore.current,
    () => {
      if(spriteStore.current){
        setEditContentType(EditContentType.Sprite)
      }
    }
  )

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
  const setEditContentType = (type: EditContentType) => {
    editContentType.value = type
    switch (type) {
      case EditContentType.Sprite:
        break
      case EditContentType.EntryCode:
        spriteStore.current = null
        break
    }
  }
  return {
    editContentType,
    setEditContentType,
    insertSnippet,
    readOnly
  }
})
