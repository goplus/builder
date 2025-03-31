import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { searchKeywordQueryParamName } from '@/pages/community/search.vue'
import type { ExploreOrder } from './apis/project'
import { useUserStore } from './stores/user'

export function getProjectEditorRoute(projectName: string, publish = false) {
  return publish ? `/editor/${projectName}?publish` : `/editor/${projectName}`
}

export function getProjectPageRoute(owner: string, name: string) {
  return `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export type UserTab = 'overview' | 'projects' | 'likes' | 'followers' | 'following'

export function getUserPageRoute(name: string, tab: UserTab = 'overview') {
  const base = `/user/${encodeURIComponent(name)}`
  if (tab === 'overview') return base
  return `${base}/${tab}`
}

export function getProjectShareRoute(owner: string, name: string) {
  return getProjectPageRoute(owner, name)
}

export function getSearchRoute(keyword: string = '') {
  return keyword !== '' ? `/search?${searchKeywordQueryParamName}=${encodeURIComponent(keyword)}` : '/search'
}

export function getExploreRoute(order?: ExploreOrder) {
  return order == null ? '/explore' : `/explore?o=${encodeURIComponent(order)}`
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Whether the route requires sign-in */
    requiresSignIn?: boolean
    /** Whether the route is a search page */
    isSearch?: boolean
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/pages/community/index.vue'),
    children: [
      {
        path: '/',
        component: () => import('@/pages/community/home.vue')
      },
      {
        path: '/explore',
        component: () => import('@/pages/community/explore.vue')
      },
      {
        path: '/search',
        component: () => import('@/pages/community/search.vue'),
        meta: { isSearch: true }
      },
      {
        path: '/user/:name',
        component: () => import('@/pages/community/user/index.vue'),
        props: true,
        children: [
          {
            path: '',
            component: () => import('@/pages/community/user/overview.vue'),
            props: true
          },
          {
            path: 'projects',
            component: () => import('@/pages/community/user/projects.vue'),
            props: true
          },
          {
            path: 'likes',
            component: () => import('@/pages/community/user/likes.vue'),
            props: true
          },
          {
            path: 'followers',
            component: () => import('@/pages/community/user/followers.vue'),
            props: true
          },
          {
            path: 'following',
            component: () => import('@/pages/community/user/following.vue'),
            props: true
          }
        ]
      },
      {
        path: '/project/:owner/:name',
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
    path: '/editor/:projectName',
    component: () => import('@/pages/editor/index.vue'),
    meta: { requiresSignIn: true },
    props: true
  },
  {
    path: '/sign-in/callback',
    component: () => import('@/pages/sign-in/callback.vue')
  },
  {
    path: '/sign-in/token',
    component: () => import('@/pages/sign-in/token.vue')
  },
  {
    path: '/share/:owner/:name',
    redirect: (to) => getProjectPageRoute(to.params.owner as string, to.params.name as string)
  },
  {
    path: '/docs/api/:pathMatch(.*)?',
    component: () => import('@/pages/docs/api.vue')
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export const initRouter = (app: App) => {
  const userStore = useUserStore()
  router.beforeEach((to, _, next) => {
    if (to.meta.requiresSignIn && !userStore.isSignedIn()) {
      userStore.initiateSignIn()
    } else {
      next()
    }
  })
  app.use(router)
}

export default router
