/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:53:46
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 14:44:48
 * @FilePath: \spx-gui\src\store\modules\editor\index.ts
 * @Description:
 */
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useSpriteStore } from '@/store'

export enum EditContentType {
  Sprite = 1,
  EntryCode = 2
}
export const useEditorStore = defineStore('editor', () => {
  const spriteStore = useSpriteStore()
  const editContentType = ref<EditContentType>(EditContentType.Sprite)
  const readOnly = computed(
    () => spriteStore.current == null && editContentType.value != EditContentType.EntryCode
  )

  watch(
    () => spriteStore.current,
    () => {
      if (spriteStore.current) {
        setEditContentType(EditContentType.Sprite)
      }
    }
  )

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
    readOnly
  }
})
