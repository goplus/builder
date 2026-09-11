<script lang="ts">
/*
 * Module-level part of `SpxProjectEditorHost`: pure helpers and constants shared by every host instance. They live
 * in this plain `<script>` block (not `<script setup>`) because they hold no per-instance state.
 *
 * Route vocabulary used throughout this file:
 * - "Course Editor route": the `course-editor` route record in `apps/xbuilder/router.ts`, whose repeatable
 *   `:inCourseEditorPath*` param names the open node of the course explorer (see `../route.ts`).
 * - "in-editor path" / `inEditorPath`: the Project Editor's own route param (edit mode + selection) that
 *   `EditorState.syncWithRouter` reads and writes through an `IRouter` (see `components/editor/editor-state.ts`).
 * - "root segments": `props.rootPath` split into segments, i.e. the embedded learner project's directory inside
 *   the course. A Course Editor path of `<root>/<tail>` means "the project is open with in-editor path `<tail>`".
 */
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import type { ILocalCache } from '@/components/editor/editing'
import { inCourseEditorPathParam, paramToSegments } from '../route'

// The embedded learner project has no owner, so the editor runs in EffectFree mode and nothing is cached locally.
/**
 * `ILocalCache` implementation that never stores anything. `EditorState` requires a local cache for its `Editing`
 * helper (`components/editor/editing.ts`), which normally persists unsaved work of an owned project across page
 * reloads. The learner project embedded in a course is loaded from the course content by `TutorialProject` and
 * carries no `owner`, so `Editing.mode` is always `EditingMode.EffectFree`: auto-save never runs and
 * `Editing.loadProject` is never called by this host, so none of these methods is expected to run in practice.
 *
 * Read by: `EditorState` constructor -> `Editing` (as `localCacheHelper`). Written by: nobody (module constant).
 * Lifecycle: created once at module load, shared by every host instance.
 */
const noopLocalCache: ILocalCache = {
  /**
   * Report an empty cache so a project load would always come from the cloud.
   * @returns `null`: there is never a cached serialized project.
   * Called by: components/editor/editing.ts#Editing.loadProject (not reached by this host, which never loads).
   */
  async load() {
    return null
  },
  /**
   * Discard the serialized project instead of caching it.
   * @returns Resolves immediately; nothing is stored.
   * Called by: components/editor/editing.ts#Saving.start (only in AutoSave mode, which this host never enters).
   */
  async save() {},
  /**
   * Nothing to clear; kept so the interface is complete.
   * @returns Resolves immediately; no side effects.
   * Called by: components/editor/editing.ts#Saving.saveToCloud, components/editor/editing.ts#Editing.loadProject
   * (neither is reached by this host).
   */
  async clear() {}
}

/**
 * The subset of a Vue Router route that `IRouter.currentRoute` must expose (see `components/editor/editor-state.ts`).
 * Snapshots are plain objects, so a stored snapshot (`lastProjectRoute`) stays stable after the live route moves on.
 */
type RouteSnapshot = Pick<RouteLocationNormalizedGeneric, 'fullPath' | 'params' | 'query' | 'hash'>

/**
 * Whether `segments` starts with every segment of `prefix`, in order. This is the single primitive that decides if a
 * Course Editor path addresses the embedded project (root) or something under it.
 * @param segments - Path segments to test (an in-Course-Editor path).
 * @param prefix - Segments that must appear at the start (the project root segments).
 * @returns `true` when `prefix` is a prefix of `segments`; an empty `prefix` matches every path.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#isProjectDocRoute,
 * components/course-editor/project/SpxProjectEditorHost.vue#projectInEditorPath
 */
function startsWithSegments(segments: string[], prefix: string[]) {
  // A longer prefix can never match; otherwise compare segment by segment at the same index.
  return prefix.length <= segments.length && prefix.every((segment, i) => segment === segments[i])
}

/**
 * Whether the route opens the project: its in-Course-Editor path is the project root or lies under it.
 * Mirrors `resolveCourseDoc` in `../course-tree.ts` returning `{ type: 'project' }`, i.e. the condition under which
 * `CourseEditor.vue` passes `active: true` to this host.
 * @param route - The live Course Editor route (or a snapshot of it).
 * @param rootSegments - The project root split into segments (`rootSegments` computed in `<script setup>`).
 * @returns `true` when the route's `inCourseEditorPath` param starts with `rootSegments` (bare root included).
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#editorRouter.currentRoute
 */
function isProjectDocRoute(route: RouteSnapshot, rootSegments: string[]) {
  // Normalize the repeatable param (string, string[] or absent) to segments, then test the root prefix.
  return startsWithSegments(paramToSegments(route.params[inCourseEditorPathParam]), rootSegments)
}

/**
 * The Project Editor's in-editor path carried by the Course Editor route (empty unless the project is open).
 * This is the "tail" after the project root: `<root>/<tail>` -> `<tail>`; `<root>` alone -> `[]`.
 * @param route - The live Course Editor route (or a snapshot of it).
 * @param rootSegments - The project root split into segments.
 * @returns The segments after the root, or `[]` when the route does not point into the project at all. Callers
 * cannot distinguish "bare root" from "not a project route" by this value alone; use `isProjectDocRoute` for that.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#translateRoute,
 * components/course-editor/project/SpxProjectEditorHost.vue#watch(router.currentRoute),
 * components/course-editor/project/SpxProjectEditorHost.vue#openInitialPath,
 * components/course-editor/project/SpxProjectEditorHost.vue#watch(props.active)
 */
function projectInEditorPath(route: RouteSnapshot, rootSegments: string[]) {
  // Normalize the route param once so both the prefix test and the slice work on the same segment list.
  const segments = paramToSegments(route.params[inCourseEditorPathParam])
  // Under the root: drop the root segments and keep the tail. Anywhere else: no in-editor path.
  return startsWithSegments(segments, rootSegments) ? segments.slice(rootSegments.length) : []
}

/**
 * What the Project Editor's state sees as its route: the Course Editor route with the tail after the project root
 * presented under the `inEditorPath` param the state expects.
 * `EditorState.syncWithRouter` reads `params.inEditorPath` (and `params.projectNameInput`, absent here) and
 * `EditorState.updateRouter` spreads `params` and `query` back into its `push`, so everything else the Course Editor
 * route carries (`courseSeriesIdInput`, `courseIdInput`, query, hash) is passed through untouched.
 * @param route - The live Course Editor route (or a snapshot of it).
 * @param rootSegments - The project root split into segments.
 * @returns A fresh `RouteSnapshot` whose params have `inCourseEditorPath` removed and `inEditorPath` set to the tail
 * (`[]` when the route is not under the root). A new object on every call: callers that need stability store it.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#watch(router.currentRoute),
 * components/course-editor/project/SpxProjectEditorHost.vue#editorRouter.currentRoute
 */
function translateRoute(route: RouteSnapshot, rootSegments: string[]): RouteSnapshot {
  // Copy the params so the live route object is never mutated, then remove the Course Editor's own param: the
  // Project Editor must not see (or echo back) `inCourseEditorPath`.
  const params = { ...route.params }
  delete params[inCourseEditorPathParam]
  // Build the snapshot: same fullPath/hash, a copied query, and the tail under `inEditorPath`.
  return {
    fullPath: route.fullPath,
    params: { ...params, inEditorPath: projectInEditorPath(route, rootSegments) },
    query: { ...route.query },
    hash: route.hash
  }
}

/**
 * Split a slash-separated path into non-empty segments (`'a//b/'` -> `['a', 'b']`, `''` -> `[]`).
 * Local twin of `pathToSegments` in `../route.ts`, applied to the `rootPath` / `initialPath` props.
 * @param path - A slash-separated path string, possibly with empty or duplicated slashes.
 * @returns The non-empty segments in order.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#rootSegments,
 * components/course-editor/project/SpxProjectEditorHost.vue#openInitialPath
 */
function toPathSegments(path: string) {
  // Split on '/', dropping empty pieces produced by leading, trailing or doubled slashes.
  return path.split('/').filter((segment) => segment !== '')
}

/**
 * Whether two segment lists denote the same path (same length, same segments in order).
 * @param a - First path as segments.
 * @param b - Second path as segments.
 * @returns `true` when every segment matches positionally.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#openInitialPath
 */
function isSamePath(a: string[], b: string[]) {
  // Length check first so a prefix relation is not mistaken for equality.
  return a.length === b.length && a.every((segment, i) => segment === b[i])
}
</script>

<script setup lang="ts">
/**
 * SpxProjectEditorHost
 *
 * Purpose: hosts the SPX Project Editor (`ProjectEditor`) for the learner project embedded in a Playground Course
 * while the course itself is edited in the Course Editor. The host owns the project's `EditorState`, keeps that
 * state alive across course-document switches and the course preview (it is always mounted by the parent, only its
 * UI is toggled by `active`), and translates between the Project Editor's route (`inEditorPath`) and the Course
 * Editor's route (`inCourseEditorPath` = `<rootPath>/<inEditorPath>`), so browser history and reloads work while the
 * project is open and nothing touches the route while it is not.
 *
 * Props:
 * - `project` — the `SpxProject` to edit (`TutorialProject.project`, already loaded); a new instance re-initializes.
 * - `rootPath` — the project's root directory inside the course (`TutorialProjectConfig.project.root`).
 * - `initialPath` — the in-editor path to open the first time the project is shown
 *   (`TutorialProjectConfig.inEditorPath`), unless the route already carries one.
 * - `active` — whether the project is the open document and not in preview; drives UI mounting and route sync.
 *
 * Emits:
 * - `update:editorState` (`EditorState | null`) — the live state, or `null` while (re)initializing and after unmount.
 *   Listened to by `components/course-editor/CourseEditor.vue` via `v-model:editor-state="editorState"`, which
 *   forwards it to `EditorHistoryButtons` and `EditorModeSwitch` in the navbar (`:state="editorState"`).
 *
 * Used by: `components/course-editor/CourseEditor.vue` (rendered through `<component :is="projectEditorHost">`,
 * always mounted; the component is resolved by `components/course-editor/project/index.ts#getProjectEditorHost`).
 *
 * Uses: `EditorState` / `IRouter` (`components/editor/editor-state.ts`), `EditorContextProvider`,
 * `CodeEditorProvider` + `loadMonaco` (`components/editor/spx-code-editor`), `ProjectEditor`, `UIDetailedLoading`,
 * `UIError`; composables `useI18n`, `useRouter`, `useNetwork`, `useQuery`, `useSignedInStateQuery`; the
 * `cloudHelpers` singleton (`models/common/cloud.ts`); and `capture` (`utils/exception`) for non-fatal errors.
 */
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import { EditorState, type IRouter } from '@/components/editor/editor-state'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  /**
   * The learner project to edit: `TutorialProject.project`, whose files were already loaded by
   * `TutorialProject.loadFiles`. Watched by identity: a new instance (course reload) triggers `initialize()`.
   */
  project: SpxProject
  /** The project's root directory inside the course; the Course Editor addresses the project by this path. */
  rootPath: string
  /** In-editor path to open the first time the project is shown, unless the route already carries one. */
  initialPath: string
  /**
   * Whether the project is open: the editor UI is shown and follows the route. While inactive, the
   * editor state (selection, undo history, ...) is kept alive but detached from the route, so other documents
   * and the course preview can drive the route freely.
   */
  active: boolean
}>()

const emit = defineEmits<{
  /** Payload: the live `EditorState`, or `null` while there is none. See the component docstring for listeners. */
  'update:editorState': [state: EditorState | null]
}>()

// Composables the `EditorState` constructor needs (`i18n`, `isOnline`, `signedInStateQuery`) plus the app router
// that `editorRouter` below wraps. `useNetwork` registers its own window listeners on mount.
const i18n = useI18n()
const router = useRouter()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()

/**
 * The project root as segments, recomputed when `rootPath` changes. Every route helper in the module block takes
 * this so the root prefix test and the tail slicing agree. Read by the route watcher, `editorRouter`,
 * `openInitialPath` and the `active` watcher.
 */
const rootSegments = computed(() => toPathSegments(props.rootPath))

/**
 * The live `EditorState` of the embedded project, or `null` while none exists (before/during `initialize()`, after
 * an initialization error, after unmount). `shallowRef` because the state is a class instance with its own
 * reactivity. Written only through `setState` (so the parent is always told); read by the template, the `active`
 * watcher, `initialize` and `onUnmounted`.
 */
const state = shallowRef<EditorState | null>(null)
/**
 * The error that made the last `initialize()` fail, or `null`. Rendered by the template's `UIError` branch with a
 * retry that re-runs `initialize`. Reset at the start of every `initialize()`.
 */
const initializationError = ref<Error | null>(null)

/**
 * Publish a new editor state: store it locally and tell the parent (`CourseEditor.vue`) through `v-model`, so the
 * navbar's history/mode controls always point at the same instance the editor UI renders.
 * @param next - The state to expose, or `null` to withdraw the current one.
 * @returns Nothing; side effects are the `state` write and the `update:editorState` emit.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#initialize,
 * components/course-editor/project/SpxProjectEditorHost.vue#onUnmounted
 */
function setState(next: EditorState | null) {
  // Store first so anything reacting to the emit already sees the new local state.
  state.value = next
  // The parent binds this with `v-model:editor-state`; `null` disables its history/mode buttons.
  emit('update:editorState', next)
}

// The editor state follows the route only while the project is open. Otherwise it keeps seeing the last project
// route (so nothing gets deselected while another document or the preview drives the route) and its own
// navigations are dropped; the Project Editor's in-editor path is mapped to and from the tail after the root.
/**
 * The last route (already translated to the Project Editor's shape) that really opened the project with a
 * non-empty in-editor path, or `null` if none was seen yet. It has two jobs:
 * 1. While inactive, `editorRouter.currentRoute` returns this frozen snapshot, so the watcher installed by
 *    `EditorState.syncWithRouter` never fires with a foreign route and the selection stays put.
 * 2. When the project is reopened on a bare root (explorer click), the `active` watcher restores its path.
 * Written by the `router.currentRoute` watcher below (only while active) and reset by `initialize()`; read by
 * `editorRouter.currentRoute` and the `active` watcher.
 */
const lastProjectRoute = shallowRef<RouteSnapshot | null>(null)
/**
 * Record every real project route while the project is open (immediate, so a reload straight into the project is
 * captured too).
 * @param current - The new live route from `router.currentRoute`.
 * @returns Nothing; side effect is updating `lastProjectRoute` when the route qualifies.
 * Called by: Vue (watch on `router.currentRoute`, immediate)
 */
watch(
  () => router.currentRoute.value,
  (current) => {
    // A bare project root (no tail) is transient: it gets replaced with the last or initial path right away.
    // Only remember routes that (a) were reached while the project is open, so routes of other documents never
    // leak in, and (b) carry a tail, so a remembered route always encodes a real selection.
    if (props.active && projectInEditorPath(current, rootSegments.value).length > 0) {
      lastProjectRoute.value = translateRoute(current, rootSegments.value)
    }
  },
  { immediate: true }
)
/**
 * The `IRouter` handed to `EditorState.syncWithRouter`: a view of the app router in which the Project Editor's
 * `inEditorPath` is the tail of the Course Editor's `inCourseEditorPath`. Both members consult `props.active` so
 * the state is detached from the route whenever the project is not the open document. Created once per component
 * instance and reused across re-initializations (it reads `props` and `rootSegments` live).
 */
const editorRouter: IRouter = {
  /**
   * The route as seen by the Project Editor state.
   * - Active and pointing into the project: the live route, translated (a new snapshot per route change, so the
   *   state's watcher fires and `selectByRoute` follows the URL).
   * - Otherwise: the frozen `lastProjectRoute` (same object every time, so the watcher stays silent) or, before any
   *   project route was recorded, a translation of the current route (which then has an empty `inEditorPath`).
   * @returns A `Ref<RouteSnapshot>` (computed) matching `IRouter.currentRoute`.
   * Called by: components/editor/editor-state.ts#EditorState.syncWithRouter (watch source),
   * components/editor/editor-state.ts#EditorState.updateRouter (reads `.value.params`/`.value.query`)
   */
  currentRoute: computed(() => {
    const current = router.currentRoute.value
    // Live translation only while the project is open AND the route really addresses it (root or below).
    if (props.active && isProjectDocRoute(current, rootSegments.value))
      return translateRoute(current, rootSegments.value)
    // Detached: keep presenting the last project route so no route change reaches the state.
    return lastProjectRoute.value ?? translateRoute(current, rootSegments.value)
  }),
  /**
   * Navigate on behalf of the Project Editor state: rewrite its `inEditorPath` into the Course Editor route.
   * Dropped entirely while inactive, so selection changes caused by project mutations (e.g. the state re-selecting
   * the first sprite after a deletion) cannot hijack the route away from the document the author is viewing.
   * @param to - A relative location from the state: `params.inEditorPath` (segments), optionally `query`, `hash`
   * and `replace`; `params` other than `inEditorPath` are ignored because the Course Editor params are rebuilt.
   * @returns The `router.push` promise while active; an already-resolved promise while inactive.
   * Called by: components/editor/editor-state.ts#EditorState.updateRouter,
   * components/course-editor/project/SpxProjectEditorHost.vue#openInitialPath
   */
  push: (to) => {
    // Detached: swallow the navigation (resolve so awaiting callers continue).
    if (!props.active) return Promise.resolve()
    const current = router.currentRoute.value
    // Keep the current query/hash unless `to` overrides them; `...to` also carries `replace`. `params` is placed
    // after `...to` so `to.params` (with the Project Editor's `inEditorPath`) never reaches the app router: the
    // Course Editor params are rebuilt from the current ones with `inCourseEditorPath` = root + in-editor path.
    return router.push({
      query: current.query,
      hash: current.hash,
      ...to,
      params: {
        ...current.params,
        [inCourseEditorPathParam]: [...rootSegments.value, ...paramToSegments(to.params?.inEditorPath)]
      }
    })
  }
}

/**
 * Set once by `onUnmounted`; never reset. Read by the async steps of `initialize` / `startRouteSync` after each
 * `await`, so an initialization that outlives the component neither publishes a state nor leaves one undisposed.
 */
let disposed = false
// Route sync starts the first time the project is opened, so that opening the course on another
// document does not write the project's route.
/**
 * Whether `EditorState.syncWithRouter` has been attached to the current state. `false` after every `initialize()`;
 * set to `true` by `startRouteSync`. Read by the `active` watcher to tell "first activation" (start syncing now)
 * from "re-activation" (restore the last path). Syncing is deferred because `syncWithRouter` immediately pushes the
 * state's own route, which would replace the URL of whatever document the author opened the course on.
 */
let routeSynced = false

/**
 * (Re)create the editor state for the current `props.project`: tear down the previous state, build a new
 * `EditorState` on the already-loaded project, start editing, attach it to the route if the project is open, and
 * publish it. Any failure is exposed through `initializationError` (with a retry) instead of being thrown.
 * @returns Resolves when the state is published or the failure recorded; never rejects.
 * Called by: Vue (watch on `props.project`, immediate),
 * components/course-editor/project/SpxProjectEditorHost.vue#template (`UIError :retry="initialize"`)
 */
async function initialize() {
  // Withdraw the current state first: the parent's navbar controls go inert, the template switches to the
  // "Preparing project..." branch and `ProjectEditor` (which injects the state) is unmounted.
  const previousState = state.value
  setState(null)
  initializationError.value = null
  // A new project makes the remembered route and the sync flag meaningless; start from a clean slate.
  lastProjectRoute.value = null
  routeSynced = false
  // Let the UI unmount the components that still hold the old state before disposing it, so nothing reads a
  // disposed state during its own teardown (same pattern as `CoursePlayground.vue`).
  await nextTick()
  previousState?.dispose()
  // The component may have been unmounted during the tick; then there is nothing left to initialize.
  if (disposed) return

  // The project is already loaded by `TutorialProject`, so `editing.loadProject` is not needed; `noopLocalCache`
  // keeps the (EffectFree) editing session from touching browser storage.
  const nextState = new EditorState(i18n, props.project, isOnline, signedInStateQuery, cloudHelpers, noopLocalCache)
  try {
    // Starts dirty monitoring, file pre-loading and the auto-save watcher (a no-op in EffectFree mode).
    nextState.editing.startEditing()
    // Attach to the route only if the project is the open document; otherwise the `active` watcher does it on the
    // first activation. Note `props.active` is sampled here: a toggle while `state` is still `null` is not seen by
    // the `active` watcher (it returns early on a null state).
    if (props.active) await startRouteSync(nextState)
    // Unmounted while syncing: throw so the shared cleanup below disposes the half-built state.
    if (disposed) throw new Error('Project editor disposed during initialization')
    // Publish: the template renders `ProjectEditor`, the parent's navbar controls come alive.
    setState(nextState)
  } catch (error) {
    // Release watchers/runtime of the state that never became current.
    nextState.dispose()
    // After unmount nobody can show the error, so stay silent.
    if (disposed) return
    // Surface the failure to the template (`UIError` with retry).
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Connect a state to the route: select the initial in-editor path (normalizing the URL) and then let
 * `EditorState.syncWithRouter` keep URL and selection in sync both ways through `editorRouter`. Must only run
 * while `props.active` is `true`, because `editorRouter.push` drops navigations otherwise.
 * @param editorState - The state to attach; either the one being built by `initialize` or the published one.
 * @returns Resolves once syncing is on (`routeSynced === true`), or early if the component was unmounted meanwhile.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#initialize,
 * components/course-editor/project/SpxProjectEditorHost.vue#watch(props.active)
 */
async function startRouteSync(editorState: EditorState) {
  // Select something and make the URL reflect it before the two-way sync starts.
  await openInitialPath(editorState)
  // The `await` above may span a navigation; do not attach watchers to a state that is about to be disposed.
  if (disposed) return
  // From here on: URL -> `selectByRoute`, and selection -> `editorRouter.push` (see `editor-state.ts`).
  editorState.syncWithRouter(editorRouter)
  routeSynced = true
}

/**
 * Select the initial in-editor path: the one in the route if any, otherwise the configured one.
 * The configured path may refer to editor routes the Project Editor does not recognize yet (Simple Mode, for
 * example), so an unresolvable path falls back to the default selection instead of blocking the whole editor.
 * Afterwards the URL is normalized (with `replace`) so that it carries the path actually selected.
 * @param editorState - The state whose selection is being initialized.
 * @returns Resolves after the URL matches the selection (immediately if it already did).
 * @throws Only if the fallback `selectByRoute([])` itself throws; a failing configured path is captured, not thrown.
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#startRouteSync
 */
async function openInitialPath(editorState: EditorState) {
  // Prefer the path in the URL (reload, history, deep link); fall back to the course's configured `inEditorPath`.
  const routePath = projectInEditorPath(router.currentRoute.value, rootSegments.value)
  let path = routePath.length > 0 ? routePath : toPathSegments(props.initialPath)
  try {
    // `selectByRoute` throws for paths it does not recognize.
    editorState.selectByRoute(path)
  } catch (error) {
    // Report (Sentry + console) and degrade to the default selection rather than failing initialization.
    capture(error, `Failed to open in-editor path /${path.join('/')}`)
    path = []
    editorState.selectByRoute(path)
  }
  // URL already reflects the selection: avoid a redundant navigation.
  if (isSamePath(path, routePath)) return
  // Rewrite the bare root / unresolvable path in place (`replace`) so it does not linger in browser history.
  await editorRouter.push({ params: { inEditorPath: path }, replace: true })
}

/**
 * Rebuild the editor state whenever a different `SpxProject` instance is passed (immediate: also on setup).
 * @returns Nothing; the returned promise of `initialize` is deliberately ignored (it never rejects).
 * Called by: Vue (watch on `props.project`, immediate)
 */
watch(
  () => props.project,
  () => void initialize(),
  { immediate: true }
)

/**
 * React to the project being opened or closed as the current document.
 * Closing needs no action: `editorRouter` already detaches by reading `props.active`, and the template unmounts the
 * editor UI. Opening either starts route sync (first time) or restores the remembered in-editor path when the
 * project was reopened on its bare root.
 * @param active - The new value of `props.active`.
 * @returns Resolves after any navigation it triggered; early-returns are silent.
 * Called by: Vue (watch on `props.active`)
 */
watch(
  () => props.active,
  async (active) => {
    // No state yet (initializing or failed): `initialize` handles route sync itself when it finishes.
    const editorState = state.value
    if (editorState == null) return
    if (!active) {
      // Known gap (owner: #3416): unmounting the editor UI tears down the project runner, but
      // `EditorPreview` does not reset `EditorState.runtime` on unmount, so a project that was running
      // comes back with `runtime.running` still in debug mode. To be fixed in `EditorPreview` itself.
      return
    }
    // First activation of a state that was initialized while another document was open: attach to the route now.
    if (!routeSynced) {
      await startRouteSync(editorState)
      return
    }
    // Reopened without a path (e.g. from the explorer): return to where the editor was.
    const last = lastProjectRoute.value
    if (last == null) return
    const lastPath = paramToSegments(last.params.inEditorPath)
    // Only when the URL is the bare root and a real path is remembered; a deep link with its own tail wins.
    if (projectInEditorPath(router.currentRoute.value, rootSegments.value).length === 0 && lastPath.length > 0) {
      const current = router.currentRoute.value
      // `replace` (not push) so the transient bare root is not kept in history; restore the remembered query/hash
      // along with the path. Built directly on the app router (not `editorRouter.push`) to use `last`'s query/hash.
      await router.replace({
        params: { ...current.params, [inCourseEditorPathParam]: [...rootSegments.value, ...lastPath] },
        query: last.query,
        hash: last.hash
      })
    }
  }
)

/**
 * Loads the Monaco editor bundle for the current UI language. `useQuery` runs the loader inside a `watchEffect`,
 * so a language change re-runs it; `isLoading`/`progress`/`error`/`refetch` drive the template branches below.
 * Independent of the editor state: it is fetched even while the project is inactive.
 */
const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

/**
 * Tear down on unmount: flag `disposed` for in-flight async work, withdraw the state from the parent, then dispose
 * it (runtime, editing watchers, route sync watchers).
 * @returns Nothing; side effects as described.
 * Called by: Vue lifecycle (onUnmounted)
 */
onUnmounted(() => {
  // Stops any pending `initialize` / `startRouteSync` from publishing or attaching after this point.
  disposed = true
  // Withdraw before disposing so the parent never holds a reference to a disposed state.
  const current = state.value
  setState(null)
  current?.dispose()
})
</script>

<template>
  <!--
    The editor UI exists only while the project is the open document (`active`). When inactive the whole subtree is
    unmounted while the `EditorState` survives in `state`, so selection and undo history come back on reopen.
  -->
  <template v-if="active">
    <!-- Initializing: no state yet and no failure recorded (see `initialize`). Indeterminate progress. -->
    <UIDetailedLoading v-if="state == null && initializationError == null" :percentage="0">
      <span>{{ $t({ en: 'Preparing project...', zh: '准备项目中...' }) }}</span>
    </UIDetailedLoading>
    <!-- Initialization failed: show the raw error and let the author retry by re-running `initialize`. -->
    <UIError v-else-if="initializationError != null" :retry="initialize">
      {{ initializationError.message }}
    </UIError>
    <!-- State ready but the Monaco bundle is still downloading: show its real progress. -->
    <UIDetailedLoading
      v-else-if="monacoQueryRet.isLoading.value"
      :percentage="monacoQueryRet.progress.value.percentage"
    >
      <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
    </UIDetailedLoading>
    <!-- Monaco failed to load: localized message from `useQuery`, retry re-fetches the bundle. -->
    <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
      {{ $t(monacoQueryRet.error.value.userMessage) }}
    </UIError>
    <!--
      Everything ready: provide the editor context (project + state) that `ProjectEditor` and its descendants inject
      through `useEditorCtx`, and the loaded Monaco instance for the code editors. `monaco` is non-null here because
      the loading and error branches above were not taken.
    -->
    <EditorContextProvider v-else-if="state != null" :project="state.project" :state="state">
      <CodeEditorProvider :monaco="monacoQueryRet.data.value!">
        <ProjectEditor />
      </CodeEditorProvider>
    </EditorContextProvider>
  </template>
</template>
