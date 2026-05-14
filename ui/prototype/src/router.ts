import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tutorials'
    },
    {
      path: '/tutorials',
      name: 'tutorials',
      component: () => import('@/pages/tutorials/index.vue')
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/pages/editor/index.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/tutorials'
    }
  ]
})

export default router
