import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      loggedIn: true,
      avatarUrl: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
    }
  },
  persist: true
})
