import { ref, computed } from 'vue'
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
         * Remove item from list by name.
         * @param name the name of item
         * @returns the removed item
         */
    function removeItemByName(name: string) {
        if (!isItemExistByName(name)) return null
        const index = backdrops.value.findIndex(item => item.name === name)
        if (index > -1) {
            return backdrops.value.splice(index, 1).pop() as Backdrop
        }
        return null
    }
    /**
         * Check if item exists by name.
         * @param name the name of item
         * @returns true if the item exists
         */
    function isItemExistByName(name: string): boolean {
        return map.value.has(name)
    }
    /**
         * The map of assets in order to get item by name in `O(1)`.
         */
    const map = computed(() => {
        let map = new Map<string, T>()
        backdrops.value.forEach(item => {
            map.set(item.name, item)
        })
        return map
    })

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
        removeItemByName,
        removeItem
    }
})
