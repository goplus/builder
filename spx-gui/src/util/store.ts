/*
 * @Author: Tu Guobin
 * @Date: 2024-01-17 18:48
 * @LastEditors: Tu Guobin
 * @LastEditTime: 2024-01-17 18:48
 * @FilePath: /spx-gui/src/util/store.ts
 */

import { ref, Ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { AssetBase } from '@/interface/asset'

/**
 * Create a store to manage assets.
 * @param name the name of store
 * @returns the store
 */
export default function createStore<T extends AssetBase>(name: string) {
    return defineStore(name, () => {
        const list: Ref<T[]> = ref([])
        const map = computed(() => {
            let map = new Map<string, T>()
            list.value.forEach(item => {
                map.set(item.name, item)
            })
            return map
        })
        function setItem(newItems: T[]) {
            list.value = newItems
        }
        function addItem(...newItems: T[]) {
            newItems.forEach(item => {
                if (isItemExistByName(item.name)) {
                    throw new Error(`All ${name}s must be unique, ${item.name} already exists.`)
                }
                list.value.push(item)
            })
        }
        function removeItemByName(name: string) {
            if (!isItemExistByName(name)) return
            const index = list.value.findIndex(item => item.name === name)
            index > -1 && list.value.splice(index, 1)
        }
        function removeItemByRef(item: T) {
            if (!isItemExistByRef(item)) return
            const index = list.value.indexOf(item)
            index > -1 && list.value.splice(index, 1)
        }
        function getItemByName(name: string): T | null {
            return map.value.get(name) || null
        }
        function isItemExistByName(name: string): boolean {
            return map.value.has(name)
        }
        function isItemExistByRef(item: T): boolean {
            return map.value.has(item.name)
        }
        return {
            setItem,
            addItem,
            removeItemByName,
            removeItemByRef,
            getItemByName,
            isItemExistByName,
            isItemExistByRef,
            [name + 's']: list,
        }
    })
}
