/*
 * @Author: Xu Ning
 * @Date: 2024-01-15 09:16:35
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-10 14:51:46
 * @FilePath: \builder\spx-gui\src\router\index.ts
 * @Description:
 */
import type { App } from 'vue'
import {
  createRouter,
  createWebHistory,
  type NavigationGuard,
  type RouteRecordRaw
} from 'vue-router'
import { useUserStore } from './stores'

const signInGuard: NavigationGuard = (to, from, next) => {
  const userStore = useUserStore()
  if (!userStore.hasSignedIn()) {
    userStore.signInWithRedirection()
  } else {
    next()
  }
}

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/editor' },
  {
    path: '/editor',
    component: () => import('@/components/editor/EditorHomepage.vue'),
    beforeEnter: signInGuard
  },
  {
    path: '/editor/:projectName',
    component: () => import('@/components/editor/EditorHomepage.vue'),
    beforeEnter: signInGuard
  },
  {
    path: '/callback',
    component: () => import('@/components/SigninCallback.vue')
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export const initRouter = async (app: App) => {
  app.use(router)
  // This is an example of a routing result that needs to be loaded.
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, 0)
  })
}
