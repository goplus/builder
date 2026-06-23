import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { ExploreOrder } from '@/apis/project'
import { searchKeywordQueryParamName } from './pages/community/search.vue'

export function getProjectEditorRoute(ownerName: string, projectName: string, publish = false) {
  ownerName = encodeURIComponent(ownerName)
  projectName = encodeURIComponent(projectName)
  return publish ? `/editor/${ownerName}/${projectName}?publish` : `/editor/${ownerName}/${projectName}`
}

export function getOwnProjectEditorRoute(projectName: string, publish = false) {
  projectName = encodeURIComponent(projectName)
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

export const homePageName = 'home'

declare module 'vue-router' {
  interface RouteMeta {
    /** Whether the route is a search page */
    isSearch?: boolean
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('./pages/community/index.vue'),
    children: [
      {
        path: '/',
        name: homePageName,
        component: () => import('./pages/community/home.vue')
      },
      {
        path: '/explore',
        component: () => import('./pages/community/explore.vue')
      },
      {
        path: '/search',
        component: () => import('./pages/community/search.vue'),
        meta: { isSearch: true }
      },
      {
        path: '/user/:nameInput',
        component: () => import('./pages/community/user/index.vue'),
        props: true,
        children: [
          {
            path: '',
            component: () => import('./pages/community/user/overview.vue'),
            props: true
          },
          {
            path: 'projects',
            component: () => import('./pages/community/user/projects.vue'),
            props: true
          },
          {
            path: 'likes',
            component: () => import('./pages/community/user/likes.vue'),
            props: true
          },
          {
            path: 'followers',
            component: () => import('./pages/community/user/followers.vue'),
            props: true
          },
          {
            path: 'following',
            component: () => import('./pages/community/user/following.vue'),
            props: true
          }
        ]
      },
      {
        path: '/project/:ownerInput/:nameInput',
        component: () => import('./pages/community/project.vue'),
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
    component: () => import('./pages/editor/index.vue'),
    props: true
  },
  {
    path: '/tutorials',
    component: () => import('./pages/tutorials/index.vue')
  },
  {
    path: '/course/:courseSeriesIdInput/:courseIdInput/start',
    component: () => import('./pages/tutorials/course-start.vue'),
    props: true
  },
  {
    path: '/course-series/:courseSeriesIdInput',
    component: () => import('./pages/tutorials/course-series.vue'),
    props: true
  },
  {
    path: '/editor/:projectNameInput',
    component: () => import('./pages/editor/own-project.vue'),
    props: true
  },
  {
    path: '/sign-in/callback',
    component: () => import('./pages/sign-in/callback.vue')
  },
  {
    path: '/sign-in/token',
    component: () => import('./pages/sign-in/token.vue')
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
        component: () => import('./pages/docs/api.vue')
      },
      {
        path: 'ui-design',
        component: () => import('./pages/docs/ui-design/index.vue')
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('./pages/admin/index.vue'),
    children: [
      {
        path: '',
        redirect: '/admin/users'
      },
      {
        path: 'users',
        component: () => import('./pages/admin/users.vue')
      },
      {
        path: 'users/:userID',
        component: () => import('./pages/admin/user.vue'),
        props: true
      },
      {
        path: 'users/:userID/app-grants/:grantID',
        component: () => import('./pages/admin/grant.vue'),
        props: true
      },
      {
        path: 'apps',
        component: () => import('./pages/admin/apps.vue')
      },
      {
        path: 'apps/:appID',
        component: () => import('./pages/admin/app.vue'),
        props: true
      },
      {
        path: 'audit-logs',
        component: () => import('./pages/admin/audit-logs.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('./pages/404/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(''),
  routes
})

export const initRouter = (app: App) => {
  app.use(router)
  return router
}
