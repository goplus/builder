/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-07 21:43:44
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 11:05:21
 * @FilePath: \spx-gui\src\store\modules\sprite\index.ts
 * @Description:
 */
import { defineStore, storeToRefs } from 'pinia'
import { Sprite } from '@/class/sprite'
import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useProjectStore } from '../index'
export const useSpriteStore = defineStore('sprite', () => {
  const projectStore = useProjectStore()
  const { project } = storeToRefs(projectStore)

  const current: Ref<Sprite | null> = ref(null)

  const list: ComputedRef<Sprite[]> = computed(() => {
    return project.value.sprite.list as Sprite[]
  })

  const map = computed(() => new Map(list.value.map((item) => [item.name, item])))

  watch(
    () => project.value,
    () => {
      console.log('current clear')
      current.value = null
    }
  )

  function addItem(item: Sprite) {
    project.value.sprite.add(item)
  }

  function setCurrentByName(name: string) {
    if (map.value.has(name)) {
      current.value = map.value.get(name) || null
    }
  }

  function removeItemByName(name: string) {
    const sprite = map.value.get(name)
    if (sprite) {
      if (current.value === sprite) {
        current.value = list.value[0] || null
      }
      project.value.sprite.remove(sprite)
    }
  }

  function existsByName(name: string): boolean {
    return map.value.has(name)
  }

  return {
    list,
    current,
    addItem,
    setCurrentByName,
    removeItemByName,
    existsByName
  }
})
