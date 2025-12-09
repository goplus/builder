import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { searchKeywordQueryParamName } from '@/pages/community/search.vue'
import type { ExploreOrder } from './apis/project'
import { initiateSignIn, isSignedIn, getSignedInUsername } from './stores/user'

export function getProjectEditorRoute(ownerName: string, projectName: string, publish = false) {
  ownerName = encodeURIComponent(ownerName)
  projectName = encodeURIComponent(projectName)
  return publish ? `/editor/${ownerName}/${projectName}?publish` : `/editor/${ownerName}/${projectName}`
}

export function getOwnProjectEditorRoute(projectName: string, publish = false) {
  const username = getSignedInUsername()
  if (username == null) throw new Error('User not signed in')
  return getProjectEditorRoute(username, projectName, publish)
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

export const homePageName = 'home'

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
        name: homePageName,
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
    path: '/editor/:ownerName/:projectName/:inEditorPath*',
    component: () => import('@/pages/editor/index.vue'),
    props: true
  },
  {
    path: '/tutorials',
    component: () => import('@/pages/tutorials/index.vue')
  },
  {
    path: '/course/:courseSeriesId/:courseId/start',
    component: () => import('@/pages/tutorials/course-start.vue'),
    props: true
  },
  {
    path: '/course-series/:courseSeriesId',
    component: () => import('@/pages/tutorials/course-series.vue'),
    props: true
  },
  {
    path: '/editor/:projectName',
    redirect(to) {
      const { projectName } = to.params
      const username = getSignedInUsername()
      // Route with `redirect` will not trigger the global `beforeEach` guard,
      // so we need to check sign-in status here.
      if (username == null) {
        initiateSignIn()
        throw new Error('User not signed in') // prevent router from redirecting
      }
      return getProjectEditorRoute(username, projectName as string)
    }
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
    path: '/docs',
    children: [
      {
        path: 'api/:pathMatch(.*)?',
        component: () => import('@/pages/docs/api.vue')
      },
      {
        path: 'ui-design',
        component: () => import('@/pages/ui-design/index.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/pages/404/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export const initRouter = (app: App) => {
  router.beforeEach((to, _, next) => {
    if (to.meta.requiresSignIn && !isSignedIn()) {
      initiateSignIn()
    } else {
      next()
    }
  })
  app.use(router)
  return router
}
