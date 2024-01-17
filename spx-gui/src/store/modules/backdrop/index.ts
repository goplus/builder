import { ref, readonly, Ref } from 'vue'
import { defineStore } from 'pinia'
import Backdrop from '@/class/backdrop'

export const useBackdropStore = defineStore('backdrop', () => {
    /**
     * Current backdrop.
     */
    const backdrop: Ref<Backdrop> = ref(new Backdrop())

    /**
     * Set current backdrop.
     * @param {Backdrop} back
     */
    function setItem(back: Backdrop) {
        backdrop.value = back
    }

    return {
        setItem,
        backdrop: readonly(backdrop),
    }
})
