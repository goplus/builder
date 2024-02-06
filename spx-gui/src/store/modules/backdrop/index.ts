/*
 * @Author: Xu Ning
 * @Date: 2024-02-05 17:08:23
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 12:34:43
 * @FilePath: /spx-gui/src/store/modules/backdrop/index.ts
 * @Description:
 */
import { defineStore, storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSpriteStore } from '../sprite'
import { Backdrop } from '@/class/backdrop'
import { useProjectStore } from '../index'
export const useBackdropStore = defineStore('backdrop', () => {
  const projectStore = useProjectStore()
  const { project } = storeToRefs(projectStore)
  const backdrop = computed(() => {
    console.log('project.value', project.value, project.value.backdrop)
    return project.value.backdrop
  })

  /**
   * Set current backdrop.
   * @param {Backdrop} back
   */
  function setItem(back: Backdrop) {
    project.value.backdrop = back
  }

  /**
   * Set the zorder of the backdrop.
   * @param zOrder
   */
  function setZOrder(zOrder: string[] = genZOrder()) {
    backdrop.value.config.zorder = zOrder
  }

  /**
   * Generate the zorder of the Sprite in the stage.
   * The later Sprite will be above the previous Sprite, which means that the later Sprite will override the previous Sprite.
   */
  function genZOrder() {
    const spriteStore = useSpriteStore()
    const { list: sprites } = spriteStore
    return sprites.map((sprite) => sprite.name)
  }

  return {
    backdrop,
    setItem,
    setZOrder,
    genZOrder
  }
})
