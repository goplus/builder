/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-12 21:43:01
 * @FilePath: /builder/spx-gui/src/store/store.ts
 * @Description: pinia example
 */
import { defineStore } from "pinia";
export const testStore = defineStore({
  id: "test",
  state: () => ({
    id: "",
  }),
  persist: {
    enabled: true,
  }
});