/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-07 21:43:44
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-11 15:50:24
 * @FilePath: \spx-gui\src\store\modules\sprite\index.ts
 * @Description:
 */
import { defineStore } from 'pinia'
import { Sprite } from '@/class/sprite'
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useProjectStore } from '../index'
export const useSpriteStore = defineStore('sprite', () => {
  const projectStore = useProjectStore()

  const current: Ref<Sprite | null> = ref(null)

  watch(
    () => projectStore.project,
    () => {
      current.value = projectStore.project.sprite.list[0] || null
    }
  )

  return {
    current
  }
})
