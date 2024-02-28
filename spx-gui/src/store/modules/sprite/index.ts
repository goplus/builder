/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-07 21:43:44
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-28 17:33:55
 * @FilePath: \spx-gui\src\store\modules\sprite\index.ts
 * @Description:
 */
import { defineStore, storeToRefs } from 'pinia'
import { Sprite } from '@/class/sprite'
import { computed, ref } from 'vue'
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

  function addItem(item: Sprite) {
    project.value.sprite.add(item)
    // TODO: consider the zorder update  dependent on the addition and removal of sprite in project instance instead operate in sprite store's add/remove function
    project.value.backdrop.config.zorder.push(item.name)
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
      // TODO: consider the zorder update  dependent on the addition and removal of sprite in project instance instead operate in sprite store's add/remove function
      project.value.backdrop.config.zorder.splice(project.value.backdrop.config.zorder.indexOf(sprite.name), 1)
    }
  }

    return {
        list, current,
        addItem,
        setCurrentByName,
        removeItemByName,
        existsByName
    }
})
