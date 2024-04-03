import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// TODO: type-safe route match & construct (with params)
export const editProjectRouteName = 'edit-project'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/editor' },
  {
    path: '/editor',
    component: () => import('@/components/editor/EditorHomepage.vue')
  },
  {
    name: editProjectRouteName,
    path: '/editor/:projectName',
    component: () => import('@/components/editor/EditorHomepage.vue')
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
