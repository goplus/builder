/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 19:30:18
 * @FilePath: /builder/spx-gui/src/store/modules/backdrop/index.ts
 * @Description: The store of backdrop.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import Backdrop from '@/class/backdrop'

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

    return {
        setItem,
        backdrop,
    }
})
