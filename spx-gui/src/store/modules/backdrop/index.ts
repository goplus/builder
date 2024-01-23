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
    const backdrops = ref<Backdrop[]>([])

    /**
     * Add backdrop.
     * @param {Backdrop} backdrop
     */
     function addItem(backdrop: Backdrop) {
        backdrops.value.push(backdrop);
    }

    /**
     * Remove backdrop.
     * @param {number} index
     */
    function removeItem(index: number) {
        if (index >= 0 && index < backdrops.value.length) {
            backdrops.value.splice(index, 1);
        }
    }

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
        backdrops,
        addItem,
        removeItem
    }
})
