import { createRouter, createWebHistory } from 'vue-router'

export type UserTab = 'overview' | 'projects' | 'likes' | 'followers' | 'following'

export function getProjectPageRoute(owner: string, name: string) {
  return `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export function getProjectEditorRoute(owner: string, name: string) {
  return `/editor/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export function getUserPageRoute(name: string, tab: UserTab = 'overview') {
  const base = `/user/${encodeURIComponent(name)}`
  return tab === 'overview' ? base : `${base}/${tab}`
}

export function getSearchRoute(keyword = '') {
  return keyword === '' ? '/search' : `/search?q=${encodeURIComponent(keyword)}`
}

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
          path: '/user/:nameInput',
          component: () => import('@/pages/community/user/index.vue'),
          props: true,
          children: [
            {
              path: '',
              name: 'user-overview',
              component: () => import('@/pages/community/user/overview.vue'),
              props: true
            },
            {
              path: 'projects',
              name: 'user-projects',
              component: () => import('@/pages/community/user/projects.vue'),
              props: true
            },
            {
              path: 'likes',
              name: 'user-likes',
              component: () => import('@/pages/community/user/likes.vue'),
              props: true
            },
            {
              path: 'followers',
              name: 'user-followers',
              component: () => import('@/pages/community/user/followers.vue'),
              props: true
            },
            {
              path: 'following',
              name: 'user-following',
              component: () => import('@/pages/community/user/following.vue'),
              props: true
            }
          ]
        },
        {
          path: '/project/:ownerInput/:nameInput',
          name: 'project',
          component: () => import('@/pages/community/project.vue'),
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
    },
    {
      path: '/sign-in/callback',
      name: 'sign-in-callback',
      component: () => import('@/pages/sign-in/callback.vue')
    },
    {
      path: '/sign-in/token',
      name: 'sign-in-token',
      component: () => import('@/pages/sign-in/token.vue')
    },
    {
      path: '/share/:owner/:name',
      redirect: (to) => getProjectPageRoute(to.params.owner as string, to.params.name as string)
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/pages/404/index.vue')
    }
  ]
})

export default router
