<script lang="ts">
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import type { PathSegments } from '@/utils/route'
import type { ILocalCache } from '@/components/editor/editing'
import { inCourseEditorPathParam, paramToSegments } from '../route'

// The embedded learner project has no owner, so editing runs in EffectFree mode and never uses the local cache.
const noopLocalCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}

type RouteLike = Pick<RouteLocationNormalizedGeneric, 'params'>

/** Shown to the editor state before the project has a path of its own; one instance, so its watcher stays quiet. */
const noProjectPath: PathSegments = []

function startsWithSegments(segments: string[], prefix: string[]) {
  return prefix.length <= segments.length && prefix.every((segment, i) => segment === segments[i])
}

/** Whether the route's in-Course-Editor path is the project root or lies under it. */
function isProjectDocRoute(route: RouteLike, rootSegments: string[]) {
  return startsWithSegments(paramToSegments(route.params[inCourseEditorPathParam]), rootSegments)
}

/**
 * The in-editor path the route carries for the project: `<root>/<tail>` -> `<tail>`. Empty both on the bare root and
 * on a route outside the project; `isProjectDocRoute` tells them apart.
 */
function projectInEditorPath(route: RouteLike, rootSegments: string[]) {
  const segments = paramToSegments(route.params[inCourseEditorPathParam])
  return startsWithSegments(segments, rootSegments) ? segments.slice(rootSegments.length) : []
}

function toPathSegments(path: string) {
  return path.split('/').filter((segment) => segment !== '')
}

function isSamePath(a: string[], b: string[]) {
  return a.length === b.length && a.every((segment, i) => segment === b[i])
}
</script>

<script setup lang="ts">
/**
 * Hosts the Project Editor for the learner project embedded in a course. It owns the project's `EditorState`, which
 * outlives the editor UI, and maps the in-editor path to the Course Editor route `<rootPath>/<inEditorPath>`.
 */
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter, type LocationQuery } from 'vue-router'
import { capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import { EditorState, type IInEditorRouter } from '@/components/editor/editor-state'
import type { History } from '@/components/editor/history'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  /** The learner project to edit, already loaded. A new instance re-creates the editor state. */
  project: SpxProject
  /** The project's root directory inside the course; the Course Editor route addresses the project by this path. */
  rootPath: string
  /** In-editor path to open the first time the project is shown, unless the route already carries one. */
  initialPath: string
  /** Where the edits of the project are recorded, together with those of the rest of the course. */
  history: History
  /**
   * Whether the project is the open document. While inactive, the editor UI is unmounted and the editor state
   * (selection, ...) is kept alive but detached from the route.
   */
  active: boolean
}>()

const emit = defineEmits<{
  /** The current editor state, or `null` while initializing, after a failure and after unmount. */
  'update:editorState': [state: EditorState | null]
}>()

const i18n = useI18n()
const router = useRouter()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()

const rootSegments = computed(() => toPathSegments(props.rootPath))

// Written only through `setState`, so the parent always sees the state the editor UI renders.
const state = shallowRef<EditorState | null>(null)
const initializationError = ref<Error | null>(null)

function setState(next: EditorState | null) {
  // Store first so anything reacting to the emit already sees the new local state.
  state.value = next
  emit('update:editorState', next)
}

/** Where the project was last open with a path of its own, so it can be returned to (query and hash included). */
const lastProjectLocation = shallowRef<{ path: PathSegments; query: LocationQuery; hash: string } | null>(null)
/** Remember the live route as the project's own. Only call it while the project is open. */
function rememberProjectRoute() {
  const current = router.currentRoute.value
  const path = projectInEditorPath(current, rootSegments.value)
  // The bare project root is transient (it is replaced right away) and names no selection to come back to.
  if (path.length === 0) return
  lastProjectLocation.value = { path, query: current.query, hash: current.hash }
}
// The bare-root replacement in flight. Both the route watcher and the `active` watcher may ask for one for the same
// navigation; the second reuses it.
let restoring: Promise<unknown> | null = null
/**
 * Replace the bare project root, which is what the activity bar's project button opens, with where the project was
 * left. A route with a path of its own (deep link, history) is left alone.
 */
function restoreProjectRoute() {
  if (restoring != null) return restoring
  const last = lastProjectLocation.value
  if (last == null) return
  const current = router.currentRoute.value
  if (!isProjectDocRoute(current, rootSegments.value)) return
  if (projectInEditorPath(current, rootSegments.value).length > 0) return
  // `replace` (not push) so the transient bare root is not kept in history. Built directly on the app router (not
  // `editorRouter.push`) to use `last`'s query/hash.
  restoring = router
    .replace({
      params: { ...current.params, [inCourseEditorPathParam]: [...rootSegments.value, ...last.path] },
      query: last.query,
      hash: last.hash
    })
    .finally(() => {
      restoring = null
    })
  return restoring
}
// While the project is open, remember its routes and send the bare root back to where the project was. Before the
// first sync there is nowhere to go back to; `startRouteSync` opens the initial path instead.
watch(
  () => router.currentRoute.value,
  () => {
    if (!props.active) return
    rememberProjectRoute()
    if (routeSynced) void restoreProjectRoute()
  }
)
// The in-editor path is the tail of the Course Editor route after the project root. The state is detached from the
// route while the project is not open.
const editorRouter: IInEditorRouter = {
  // While the project is not open, or sits on its transient bare root, the state keeps seeing where the project was
  // (the same array, so it does not react): shown an empty path, it would select its default and navigate there,
  // overtaking `restoreProjectRoute`.
  currentPath: computed(() => {
    const path = projectInEditorPath(router.currentRoute.value, rootSegments.value)
    if (props.active && path.length > 0) return path
    return lastProjectLocation.value?.path ?? noProjectPath
  }),
  // Dropped while the project is not open, so a selection the state makes on its own (e.g. after the selected sprite
  // was deleted) cannot take the route away from the document the author is looking at.
  push: (path, options) => {
    if (!props.active) return Promise.resolve()
    const current = router.currentRoute.value
    return router.push({
      params: { ...current.params, [inCourseEditorPathParam]: [...rootSegments.value, ...path] },
      query: current.query,
      hash: current.hash,
      replace: options?.replace
    })
  }
}

// Checked after each `await`, so an initialization that outlives the component neither publishes nor leaks a state.
let disposed = false
// Whether the current state is synced with the route. Deferred to the first time the project is opened, because
// `syncWithRouter` immediately pushes the state's route over the document the course was opened on.
let routeSynced = false

/** (Re)create the editor state for the current project. Failures go to `initializationError` instead of rejecting. */
async function initialize() {
  const previousState = state.value
  setState(null)
  initializationError.value = null
  lastProjectLocation.value = null
  routeSynced = false
  // Let the UI unmount the components that still hold the old state before disposing it, so nothing reads a
  // disposed state during its own teardown.
  await nextTick()
  previousState?.dispose()
  if (disposed) return

  // The project comes already loaded, so there is no `editing.loadProject` here.
  const nextState = new EditorState(
    i18n,
    props.project,
    isOnline,
    signedInStateQuery,
    cloudHelpers,
    noopLocalCache,
    props.history
  )
  try {
    nextState.editing.startEditing()
    // The `active` watcher ignores toggles while `state` is null, so `active` is sampled here. If the project is not
    // open, the watcher starts route sync on its first activation.
    if (props.active) await startRouteSync(nextState)
    // Unmounted while syncing: throw so the shared cleanup below disposes the half-built state.
    if (disposed) throw new Error('Project editor disposed during initialization')
    setState(nextState)
  } catch (error) {
    nextState.dispose()
    // Unmounted: nobody can show the error.
    if (disposed) return
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Open the initial path, then sync the state with the route. Only call it while the project is open, since
 * `editorRouter` drops navigations otherwise.
 */
async function startRouteSync(editorState: EditorState) {
  await openInitialPath(editorState)
  if (disposed) return
  // The route watcher only records route changes, and there is none when the route already named the path to open
  // (a reload straight into the project). Without this the project would have nothing to come back to.
  rememberProjectRoute()
  editorState.syncWithRouter(editorRouter)
  routeSynced = true
}

/**
 * Select the in-editor path in the route, or else the configured one, and make the URL carry what was selected. The
 * configured path may name editor routes the Project Editor does not recognize yet (Simple Mode, for example), so an
 * unrecognized path falls back to the default selection instead of blocking the editor.
 */
async function openInitialPath(editorState: EditorState) {
  const routePath = projectInEditorPath(router.currentRoute.value, rootSegments.value)
  let path = routePath.length > 0 ? routePath : toPathSegments(props.initialPath)
  try {
    editorState.selectByRoute(path)
  } catch (error) {
    capture(error, `Failed to open in-editor path /${path.join('/')}`)
    path = []
    editorState.selectByRoute(path)
  }
  if (isSamePath(path, routePath)) return
  // Replace, so the bare root or an unrecognized path does not linger in history. This also spares the state's first
  // sync, which pushes, a history entry of its own.
  await editorRouter.push(path, { replace: true })
}

watch(
  () => props.project,
  () => void initialize(),
  { immediate: true }
)

// Closing needs no action here: `editorRouter` detaches itself and the template unmounts the editor UI.
watch(
  () => props.active,
  async (active) => {
    // No state yet (initializing or failed): `initialize` handles route sync itself when it finishes.
    const editorState = state.value
    if (editorState == null) return
    if (!active) {
      // NOTE: unmounting the editor UI tears down the project runner, but `EditorPreview` does not reset
      // `EditorState.runtime` on unmount, so a project that was running comes back with `runtime.running` still in
      // debug mode. To be fixed in `EditorPreview` itself (#3416).
      return
    }
    if (!routeSynced) {
      await startRouteSync(editorState)
      return
    }
    await restoreProjectRoute()
  }
)

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

onUnmounted(() => {
  disposed = true
  // Withdraw before disposing so the parent never holds a reference to a disposed state.
  const current = state.value
  setState(null)
  current?.dispose()
})
</script>

<template>
  <template v-if="active">
    <UIDetailedLoading v-if="state == null && initializationError == null" :percentage="0">
      <span>{{ $t({ en: 'Preparing project...', zh: '准备项目中...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="initializationError != null" :retry="initialize">
      {{ initializationError.message }}
    </UIError>
    <UIDetailedLoading
      v-else-if="monacoQueryRet.isLoading.value"
      :percentage="monacoQueryRet.progress.value.percentage"
    >
      <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
      {{ $t(monacoQueryRet.error.value.userMessage) }}
    </UIError>
    <EditorContextProvider v-else-if="state != null" :project="state.project" :state="state">
      <CodeEditorProvider :monaco="monacoQueryRet.data.value!">
        <ProjectEditor />
      </CodeEditorProvider>
    </EditorContextProvider>
  </template>
</template>
