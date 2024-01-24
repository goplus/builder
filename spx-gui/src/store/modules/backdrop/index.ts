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
