import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export const accountWebRoutePaths = {
  signIn: '/sign-in'
} as const

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: accountWebRoutePaths.signIn
  },
  {
    path: accountWebRoutePaths.signIn,
    component: () => import('@/account-web/pages/sign-in.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: accountWebRoutePaths.signIn
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export default router
