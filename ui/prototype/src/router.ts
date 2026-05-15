import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/community/index.vue'),
      children: [
        {
          path: '/',
          name: 'home',
          component: () => import('@/pages/community/home.vue')
        },
        {
          path: '/explore',
          name: 'explore',
          component: () => import('@/pages/community/explore.vue')
        },
        {
          path: '/search',
          name: 'search',
          component: () => import('@/pages/community/search.vue')
        },
        {
          path: '/user/:nameInput/:tab?',
          name: 'user',
          component: () => import('@/pages/community/user/index.vue'),
          props: true
        },
        {
          path: '/project/:ownerInput/:nameInput',
          name: 'project',
          component: () => import('@/pages/community/project.vue'),
          props: true
        },
        {
          path: '/tutorials',
          name: 'tutorials',
          component: () => import('@/pages/tutorials/index.vue')
        },
        {
          path: '/course/:courseSeriesIdInput/:courseIdInput/start',
          name: 'course-start',
          component: () => import('@/pages/tutorials/course-start.vue'),
          props: true
        },
        {
          path: '/course-series/:courseSeriesIdInput',
          name: 'course-series',
          component: () => import('@/pages/tutorials/course-series.vue'),
          props: true
        }
      ]
    },
    {
      path: '/editor',
      redirect: '/'
    },
    {
      path: '/editor/:ownerNameInput/:projectNameInput/:inEditorPath*',
      name: 'editor',
      component: () => import('@/pages/editor/index.vue'),
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/pages/404/index.vue')
    }
  ]
})

export default router
