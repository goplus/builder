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

/**
 * Name of the editing route of the Course Editor (`/course-editor/:courseSeriesIdInput/:courseIdInput/...`).
 * Named so the Course Editor can navigate to it and recognize it in guards, since one editing session spans two
 * route records (editing and preview).
 * Consumed by: apps/xbuilder/router.ts (the editing route record's `name`),
 * components/course-editor/CourseEditor.vue#openPath (named push) and #isThisCourseEditor (leave guard).
 */
export const courseEditorRouteName = 'course-editor'
/**
 * Name of the preview route of the Course Editor
 * (`/course-editor/:courseSeriesIdInput/:courseIdInput/preview/...`), where the author sees the course as a learner.
 * Consumed by: apps/xbuilder/router.ts (the preview route record's `name`),
 * components/course-editor/CourseEditor.vue#isPreviewRoute (computed), #handlePreview (named push) and
 * #isThisCourseEditor (leave guard).
 */
export const courseEditorPreviewRouteName = 'course-editor-preview'

/**
 * Builds the Course Editor path for a course inside a series, optionally opening a node of the course tree.
 * @param courseSeriesID - ID of the course series the course belongs to (becomes the `courseSeriesIdInput` param).
 * @param courseID - ID of the course to edit (becomes the `courseIdInput` param).
 * @param inCourseEditorPath - Segments of the course-tree path to open (e.g. `['project', 'sprites', 'Bird']`);
 *   empty (the default) opens the course root.
 * @returns `/course-editor/<series>/<course>`, followed by `/<segment>/...` when a path is given; every part is
 *   URI-encoded.
 * Called by: (not called yet; reserved for links into the Course Editor, e.g. from course management pages).
 */
export function getCourseEditorRoute(courseSeriesID: string, courseID: string, inCourseEditorPath: string[] = []) {
  // Both IDs are user data, so each is encoded as its own path segment.
  const base = `/course-editor/${encodeURIComponent(courseSeriesID)}/${encodeURIComponent(courseID)}`
  // No path: open the root of the course tree.
  if (inCourseEditorPath.length === 0) return base
  // Segments are encoded one by one so a `/` inside a segment cannot create extra segments.
  return `${base}/${inCourseEditorPath.map(encodeURIComponent).join('/')}`
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
    path: '/course/:courseSeriesIdInput/:courseIdInput/playground/:inEditorPath*',
    component: () => import('./pages/tutorials/course-playground.vue'),
    props: true
  },
  {
    path: '/course-series/:courseSeriesIdInput',
    component: () => import('./pages/tutorials/course-series.vue'),
    props: true
  },
  // Course preview runs the learner-side playground, which drives `inEditorPath` itself, so it gets its own
  // route record; both records render the same page so the editing session survives entering preview.
  // Listed before the editing record: its static `preview` segment outranks the editing record's catch-all in
  // vue-router's path ranking anyway, but the explicit order keeps the intent readable.
  {
    // `:inEditorPath*` is the Project Editor's in-editor path (same param name as `/editor/...` routes), so the
    // learner-side `EditorState.syncWithRouter` and `CoursePlayground.vue` work unchanged inside the preview.
    path: '/course-editor/:courseSeriesIdInput/:courseIdInput/preview/:inEditorPath*',
    name: courseEditorPreviewRouteName,
    // Same page component as the editing record: the loaded `TutorialProject` survives switching records.
    component: () => import('./pages/course-editor/index.vue'),
    // Route params are passed to the page as props (`courseSeriesIdInput`, `courseIdInput` are declared there).
    props: true
  },
  // The editing record. `:inCourseEditorPath*` is the course-tree node being edited (the course root when
  // empty); when it points into the embedded project, `SpxProjectEditorHost.vue` translates the tail after the
  // project root into the Project Editor's own `inEditorPath`.
  {
    path: '/course-editor/:courseSeriesIdInput/:courseIdInput/:inCourseEditorPath*',
    name: courseEditorRouteName,
    // Same page component as the preview record (see above).
    component: () => import('./pages/course-editor/index.vue'),
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
  // TODO: Remove this temporary Tutorial v2 development page before merging to dev.
  {
    path: '/debug/xgoexec',
    component: () => import('./pages/debug/xgoexec.vue')
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
