import type { App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export function getProjectEditorRoute(projectName: string) {
  return `/editor/${projectName}`
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

export function getProjectsRoute(keyword: string = '') {
  return keyword !== '' ? `/projects?keyword=${encodeURIComponent(keyword)}` : '/projects'
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
        path: '/projects',
        component: () => import('@/pages/community/projects.vue')
      },
      {
        path: '/user/:name',
        component: () => import('@/pages/community/user/index.vue'),
        props: true,
        children: [
          {
            path: '',
            component: () => import('@/pages/community/user/overview.vue')
          },
          {
            path: 'projects',
            component: () => import('@/pages/community/user/projects.vue')
          },
          {
            path: 'likes',
            component: () => import('@/pages/community/user/likes.vue')
          },
          {
            path: 'followers',
            component: () => import('@/pages/community/user/followers.vue')
          },
          {
            path: 'following',
            component: () => import('@/pages/community/user/following.vue')
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
    component: () => import('@/pages/editor/index.vue')
  },
  {
    path: '/callback', // TODO: remove me
    redirect: '/sign-in/callback'
  },
  {
    path: '/sign-in/callback',
    component: () => import('@/pages/sign-in/callback.vue')
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

export const initRouter = async (app: App) => {
  app.use(router)
  // This is an example of a routing result that needs to be loaded.
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, 0)
  })
}
