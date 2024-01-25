/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 11:55:38
 * @FilePath: /builder/spx-gui/src/store/modules/backdrop/index.ts
 * @Description: The store of backdrop.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import Backdrop from '@/class/backdrop'
import { useSpriteStore } from '../sprite'

/**
 * Backdrop store.
 * @example
 * const backdropStore = useBackdropStore()
 * const { backdrop } = storeToRefs(backdropStore)
 * backdropStore.setItem(new Backdrop())
 */
export const useBackdropStore = defineStore('backdrop', () => {
    /**
     * Current backdrop.
     */
    const backdrop = ref<Backdrop>(new Backdrop())

    /**
     * Set current backdrop.
     * @param {Backdrop} back
     */
    function setItem(back: Backdrop) {
        backdrop.value = back
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
        return sprites.map(sprite => sprite.name)
    }

    return {
        setItem,
        backdrop,
        setZOrder,
        genZOrder
    }
})
