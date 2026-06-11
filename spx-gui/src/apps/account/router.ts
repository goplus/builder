import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export const accountWebRoutePaths = {
  home: '/',
  signIn: '/sign-in'
} as const

const routes: Array<RouteRecordRaw> = [
  {
    path: accountWebRoutePaths.home,
    component: () => import('./pages/home.vue')
  },
  {
    path: accountWebRoutePaths.signIn,
    component: () => import('./pages/sign-in.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: accountWebRoutePaths.home
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export default router
