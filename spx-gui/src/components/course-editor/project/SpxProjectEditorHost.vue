<script lang="ts">
/*
 * Module-level part of `SpxProjectEditorHost`: pure helpers and constants shared by every host instance. They live
 * in this plain `<script>` block (not `<script setup>`) because they hold no per-instance state.
 *
 * Route vocabulary used throughout this file:
 * - "Course Editor route": the `course-editor` route record in `apps/xbuilder/router.ts`, whose repeatable
 *   `:inCourseEditorPath*` param names what the Course Editor has open (see `../route.ts`).
 * - "in-editor path": the Project Editor's own path (edit mode + selection) that `EditorState.syncWithRouter` reads
 *   and writes through an `IInEditorRouter` (see `components/editor/editor-state.ts`).
 * - "root segments": `props.rootPath` split into segments, i.e. the embedded learner project's directory inside
 *   the course. A Course Editor path of `<root>/<tail>` means "the project is open with in-editor path `<tail>`".
 */
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import type { PathSegments } from '@/utils/route'
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

type RouteLike = Pick<RouteLocationNormalizedGeneric, 'params'>

/** Shown to the editor state before the project has a path of its own; one instance, so its watcher stays quiet. */
const noProjectPath: PathSegments = []

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
 * Mirrors `resolveView` in `../course-views.ts` opening the project view, i.e. the condition under which
 * `CourseEditor.vue` passes `active: true` to this host.
 * @param route - The live Course Editor route (or a snapshot of it).
 * @param rootSegments - The project root split into segments (`rootSegments` computed in `<script setup>`).
 * @returns `true` when the route's `inCourseEditorPath` param starts with `rootSegments` (bare root included).
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#restoreProjectRoute
 */
function isProjectDocRoute(route: RouteLike, rootSegments: string[]) {
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
 * Called by: components/course-editor/project/SpxProjectEditorHost.vue#rememberProjectRoute,
 * components/course-editor/project/SpxProjectEditorHost.vue#restoreProjectRoute,
 * components/course-editor/project/SpxProjectEditorHost.vue#openInitialPath,
 * components/course-editor/project/SpxProjectEditorHost.vue#editorRouter.currentPath
 */
function projectInEditorPath(route: RouteLike, rootSegments: string[]) {
  // Normalize the route param once so both the prefix test and the slice work on the same segment list.
  const segments = paramToSegments(route.params[inCourseEditorPathParam])
  // Under the root: drop the root segments and keep the tail. Anywhere else: no in-editor path.
  return startsWithSegments(segments, rootSegments) ? segments.slice(rootSegments.length) : []
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
 * Uses: `EditorState` / `IInEditorRouter` (`components/editor/editor-state.ts`), `EditorContextProvider`,
 * `CodeEditorProvider` + `loadMonaco` (`components/editor/spx-code-editor`), `ProjectEditor`, `UIDetailedLoading`,
 * `UIError`; composables `useI18n`, `useRouter`, `useNetwork`, `useQuery`, `useSignedInStateQuery`; the
 * `cloudHelpers` singleton (`models/common/cloud.ts`); and `capture` (`utils/exception`) for non-fatal errors.
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
 * Where the project was last open with a path of its own, or `null` if it has not been yet. While the project is not
 * open, or sits on its transient bare root, `editorRouter.currentPath` keeps showing the state this `path` (the same
 * array, so the state's watcher stays quiet and nothing gets deselected); `restoreProjectRoute` returns to it, query
 * and hash included.
 */
const lastProjectLocation = shallowRef<{ path: PathSegments; query: LocationQuery; hash: string } | null>(null)
/**
 * Remember the live route as the project's own, unless it does not name a path inside the project. Callers are
 * responsible for only calling this while the project is open, so routes of other documents never leak in.
 * Called by: the `router.currentRoute` watcher below,
 * components/course-editor/project/SpxProjectEditorHost.vue#startRouteSync
 */
function rememberProjectRoute() {
  const current = router.currentRoute.value
  const path = projectInEditorPath(current, rootSegments.value)
  // A bare project root (no tail) is transient: it gets replaced with the last or initial path right away, and a
  // remembered location has to encode a real selection.
  if (path.length === 0) return
  lastProjectLocation.value = { path, query: current.query, hash: current.hash }
}
/**
 * A replacement of the bare project root in flight, or null. Both watchers that restore the project's route can
 * ask for one for the same navigation; the second finds this one and leaves the work to it.
 * Written and read by `restoreProjectRoute`.
 */
let restoring: Promise<unknown> | null = null
/**
 * Send the bare project root back to where the project was left. The bare root is what the activity bar's project
 * button opens -- the project itself, with no path of its own -- and it is transient: the state is never shown it (see
 * `editorRouter.currentPath`), and it is replaced here with the remembered location, query and hash included. A
 * route with a path of its own (a deep link, history) wins, and a route outside the project is not ours.
 * @returns The replacement's promise (or the one already in flight), or nothing when there is nothing to restore.
 * Called by: the `router.currentRoute` watcher below (sent to the bare root while the project is open), the
 * `props.active` watcher (the project reopened on it).
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
/**
 * Follow the route while the project is open: record every project route the author navigates to, and send the
 * bare root, which the activity bar's project button opens, back to where the project was. Before the first sync
 * there is nowhere to send it back to; `startRouteSync` opens the initial path instead.
 * @returns Nothing; side effects are `rememberProjectRoute` and `restoreProjectRoute`.
 * Called by: Vue (watch on `router.currentRoute`)
 */
watch(
  () => router.currentRoute.value,
  () => {
    if (!props.active) return
    rememberProjectRoute()
    if (routeSynced) void restoreProjectRoute()
  }
)
/**
 * The router handed to `EditorState.syncWithRouter`: the Project Editor's in-editor path is the tail of the Course
 * Editor's `inCourseEditorPath` after the project root. Both members consult `props.active`, so the state is detached
 * from the route whenever the project is not the open document.
 */
const editorRouter: IInEditorRouter = {
  // Live only while the project is open and the route names a path inside it. Otherwise, including on the transient
  // bare root, the state keeps seeing where the project was: shown an empty path, it would select its default and
  // navigate there, overtaking `restoreProjectRoute`.
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
  // A new project makes the remembered location and the sync flag meaningless; start from a clean slate.
  lastProjectLocation.value = null
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
  // The project is now open at a path of its own, which is what the watcher above records -- but it only sees
  // route *changes*, and there was none when the route already named the path to open (a reload straight into
  // the project). Without this the project would have nothing to come back to, and worse, would be handed a
  // foreign route the moment the author opens another document.
  rememberProjectRoute()
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
  // Rewrite the bare root / unresolvable path in place (`replace`) so it does not linger in browser history. This
  // also spares the state's first sync a history entry of its own: it pushes rather than replaces.
  await editorRouter.push(path, { replace: true })
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
    // Reopened without a path (e.g. from the activity bar): return to where the editor was.
    await restoreProjectRoute()
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
