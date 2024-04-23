import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export function getProjectEditorRoute(projectName: string) {
  return `/editor/${projectName}`
}

export function getProjectShareRoute(owner: string, name: string) {
  return `/share/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/editor' },
  {
    path: '/editor',
    component: () => import('@/components/editor/EditorHomepage.vue')
  },
  {
    path: '/editor/:projectName',
    component: () => import('@/components/editor/EditorHomepage.vue')
  },
  {
    path: '/callback',
    component: () => import('@/components/SigninCallback.vue')
  },
  {
    path: '/share/:owner/:name',
    component: () => import('@/components/share/SharePage.vue')
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
