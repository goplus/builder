/*
 * @Author: Tu Guobin
 * @Date: 2024-01-17 18:48
 * @LastEditors: Tu Guobin
 * @LastEditTime: 2024-01-17 18:48
 * @FilePath: /spx-gui/src/util/store.ts
 */

import { ref, Ref, computed } from 'vue'
import { defineStore } from 'pinia'
import AssetBase from '@/class/AssetBase'

/**
 * Create a store to manage assets.
 * @param name the name of store
 * @param hook a function that returns an object to be mixed into the store
 * @returns the store
 */
export default function createStore<T extends AssetBase>(name: string, hook?: () => Partial<T>) {
    return defineStore(name, () => {
        /**
         * The list of assets named by name. If the name is sprite, the list will be `sprites`.
         */
        const list: Ref<T[]> = ref([])

        /**
         * The current asset.
         */
        const current: Ref<T | null> = ref(null)

        /**
         * Set current item by name.
         * @param name the name of item
         */
        function setCurrentByName(name: string) {
            if (!isItemExistByName(name)) {
                throw new Error(`${name} does not exist.`)
            }
            current.value = getItemByName(name)
        }

        /**
         * Set current item by reference.
         * @param item the reference of item
         */
        function setCurrentByRef(item: T) {
            if (!isItemExistByRef(item)) {
                throw new Error(`${item.name} does not exist.`)
            }
            current.value = item
        }

        /**
         * The map of assets in order to get item by name in `O(1)`.
         */
        const map = computed(() => {
            let map = new Map<string, T>()
            list.value.forEach(item => {
                map.set(item.name, item)
            })
            return map
        })

        /**
         * Set items to replace list.
         * @param newItems the new items
         */
        function setItem(newItems: T[]) {
            list.value = []
            addItem(...newItems)
        }

        /**
         * Add items to list.
         * @param newItems the new items
         */
        function addItem(...newItems: T[]) {
            let exist = [];
            for (const item of newItems) {
                if (isItemExistByRef(item)) {
                    exist.push(item)
                    continue
                }
                list.value.push(item)
            }
            throw new Error(`All items in ${name} must be unique. ${exist.map(item => item.name).join(', ')} already exist.`)
        }

        /**
         * Remove item from list by name.
         * @param name the name of item
         * @returns the removed item
         */
        function removeItemByName(name: string): T | null {
            if (!isItemExistByName(name)) return null
            const index = list.value.findIndex(item => item.name === name)
            if (index > -1) {
                return list.value.splice(index, 1).pop() as T
            }
            return null
        }

        /**
         * Remove item from list by reference.
         * @param item the reference of item
         * @returns the removed item
         */
        function removeItemByRef(item: T): T | null {
            if (!isItemExistByRef(item)) return null
            const index = list.value.indexOf(item)
            if (index > -1) {
                return list.value.splice(index, 1).pop() as T
            }
            return null
        }

        /**
         * Get item from list by name.
         * @param name the name of item
         * @returns the item
         */
        function getItemByName(name: string): T | null {
            return map.value.get(name) || null
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
         * Check if item exists by reference.
         * @param item the reference of item
         * @returns true if the item exists
         */
        function isItemExistByRef(item: T): boolean {
            return map.value.has(item.name)
        }

        /**
         * Get hooks from hook function.
         */
        const hooks = hook ? hook() : {}

        return {
            setItem,
            addItem,
            removeItemByName,
            removeItemByRef,
            getItemByName,
            isItemExistByName,
            isItemExistByRef,
            current,
            setCurrentByName,
            setCurrentByRef,
            list,
            ...hooks
        }
    })
}
