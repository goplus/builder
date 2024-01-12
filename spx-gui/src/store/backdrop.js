import { ref, readonly } from 'vue'
import { defineStore } from 'pinia'
import Backdrop, { isBackdrop } from '@/class/backdrop'

export const useBackdropStore = defineStore('backdrop', () => {
    /**
     * Current backdrop.
     */
    const backdrop = ref(new Backdrop())

    /**
     * Set current backdrop.
     * @param {Backdrop} back
     */
    function setBackdrop(back) {
        if (!isBackdrop(back)) {
            throw new Error('Backdrop must be a instance of Backdrop.')
        }
        backdrop.value = back
    }

    return {
        setBackdrop,
        backdrop: readonly(backdrop),
    }
})
