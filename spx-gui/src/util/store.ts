/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-22 10:28:03
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:50:22
 * @FilePath: \builder\spx-gui\src\util\store.ts
 * @Description: A util to create asset store.
 */

import { ref, Ref } from 'vue'
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
        function setCurrent(name: string): void;

        /**
         * Set current item by reference.
         * @param item the reference of item
         */
        function setCurrent(item: T): void;

        function setCurrent(item: T | string) {
            current.value = typeof item === 'string' ? getItem(item) : item
        }

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
                if (isItemExist(item)) {
                    exist.push(item)
                    continue
                }
                list.value.push(item)
            }
            if (exist.length) {
                throw new Error(`All items in ${name} must be unique. ${exist.map(item => item.name).join(', ')} already exist.`)
            }
        }

        /**
         * Remove item from list by name.
         * @param name the name of item
         * @returns the removed item
         */
        function removeItem(name: string): T | null;

        /**
         * Remove item from list by reference.
         * @param item the reference of item
         * @returns the removed item
         */
        function removeItem(item: T): T | null;

        function removeItem(item: string | T): T | null {
            let index = -1;
            if (typeof item === 'string') index = list.value.findIndex(i => i.name === item)
            else index = list.value.findIndex(i => i === item)
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
        function getItem(name: string): T | null {
            return list.value.find(i => i.name === name) || null
        }

        /**
         * Check if item exists by name.
         * @param name the name of item
         * @returns true if the item exists
         */
        function isItemExist(name: string): boolean;

        /**
         * Check if item exists by reference.
         * @param item the reference of item
         * @returns true if the item exists
         */
        function isItemExist(item: T): boolean;

        function isItemExist(item: string | T): boolean {
            if (typeof item === 'string') {
                return list.value.some(i => i.name === item)
            }
            return list.value.includes(item) || list.value.some(i => i.name === item.name)
        }

        /**
         * Get hooks from hook function.
         */
        const hooks = hook ? hook() : {}

        return {
            setItem,
            addItem,
            removeItem,
            getItem,
            list,
            isItemExist,
            setCurrent,
            ...hooks
        }
    })
}
