/*
 * @Author: xuning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: xuning
 * @LastEditTime: 2024-01-12 11:55:47
 * @FilePath: /spx-gui-front-private/src/store/store.js
 * @Description: pinia example
 */
import { defineStore } from 'pinia'

// main is the name of the store. It is unique across your application
// and will appear in devtools
export const useMainStore = defineStore('main', {
  // a function that returns a fresh state
  state: () => ({
    counter: 0,
    name: 'Eduardo',
  }),
  // optional getters
  getters: {
    // getters receive the state as first parameter
    doubleCounter: (state) => state.counter * 2,
    // use getters in other getters
    doubleCounterPlusOne() {
      return this.doubleCounter + 1
    },
  },
  // optional actions
  actions: {
    reset() {
      // `this` is the store instance
      this.counter = 0
    },
  },
})