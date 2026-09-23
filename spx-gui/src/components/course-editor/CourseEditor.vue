<script setup lang="ts">
/**
 * Purpose: The Course Editor for one Playground Course. An activity bar on the left switches between the five views
 * of the course (its settings, the learner's project, the videos, the pictures and the course program), the view
 * fills the rest, and the Project Editor host for the embedded learner project stays mounted throughout; it owns
 * saving, unsaved-change tracking, the route-driven learner preview and the leave guards. The open view is derived
 * from the route (`inCourseEditorPath` param), never from local state, so it survives reloads and browser history.
 * A preview starts at the course being edited, from the author's unsaved work, and finishing it offers the next
 * course of the series, as a learner would be offered it; those are shown as they were saved.
 *
 * Props:
 * - `course`: the Playground Course being edited (its id is used by `updateCourse`; it is where a preview starts).
 * - `series`: the course series the course belongs to (shown in the navbar, and the order a preview walks).
 * - `project`: the author's working copy of the Tutorial project; the page owns its lifecycle (load / dispose).
 *
 * Emits:
 * - `saved(course)`: the `PlaygroundCourse` returned by the backend after a successful save. Listened by
 *   `apps/xbuilder/pages/course-editor/index.vue#handleSaved`, which stores it in the editing session.
 *
 * Used by: `apps/xbuilder/pages/course-editor/index.vue#template` (rendered once the session is loaded, keyed by
 * `session.course.id`).
 *
 * Uses: CourseActivityBar, CourseConfigDoc, CourseResourceGrid, CourseTextDoc, CoursePlayground and
 * CoursePlaygroundCompletionModal (preview), EditorHistoryButtons / EditorModeSwitch / NavbarWrapper (navbar), the
 * project editor host resolved from `./project` (`SpxProjectEditorHost`), the `TutorialProject` model, `saveFiles`
 * + `updateCourse` (persistence) and the helpers in `./course-views` and `./route`.
 */
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedGeneric } from 'vue-router'
import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { getCourse, updateCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseEditorPreviewRouteName, courseEditorRouteName } from '@/apps/xbuilder/router'
import { saveFiles } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import { TutorialProject } from '@/models/tutorial/project'
import { useCopilot } from '@/components/copilot/context'
import type { SessionExported } from '@/components/copilot/copilot'
import type { EditorState } from '@/components/editor/editor-state'
import EditorHistoryButtons from '@/components/editor/navbar/EditorHistoryButtons.vue'
import EditorModeSwitch from '@/components/editor/navbar/EditorModeSwitch.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/runner'
import {
  UIButton,
  UICard,
  UIDetailedLoading,
  UIError,
  UILoading,
  UITag,
  useConfirmDialogWithResult,
  useMessage,
  useModal
} from '@/components/ui'
import CourseActivityBar from './CourseActivityBar.vue'
import CourseConfigDoc from './CourseConfigDoc.vue'
import CourseResourceGrid from './CourseResourceGrid.vue'
import CourseTextDoc from './CourseTextDoc.vue'
import { useCourseEditorCopilot } from './copilot'
import { getProjectEditorHost } from './project'
import { inCourseEditorPathParam, paramToSegments, pathToSegments, segmentsToPath } from './route'
import { getChangedPaths, getDirtyViews, getViewPath, resolveView, type CourseView } from './course-views'

const props = defineProps<{
  /** The Playground Course being edited: its id is used to save, its title/thumbnail feed the completion modal. */
  course: PlaygroundCourse
  /** The series containing the course; shown next to the title and given to the completion modal. */
  series: CourseSeries
  /** The author's working copy of the Tutorial project; the page owns its lifecycle. */
  project: TutorialProject
}>()

const emit = defineEmits<{
  /** The course as returned by the backend after a successful save; the page keeps it in its session. */
  saved: [course: PlaygroundCourse]
}>()

// Composables: i18n, toast messages, the current route/router (the open view lives in the route), a confirm dialog
// resolving to a boolean, and the programmatic preview completion modal.
const { t } = useI18n()
const m = useMessage()
const route = useRoute()
const router = useRouter()
const confirm = useConfirmDialogWithResult()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const copilot = useCopilot()

/**
 * The Tutorial project's config (`index.json`), narrowed to non-null: the page only renders this component once
 * the project is loaded, so readers need not null-check it. Reading `props.project.config` keeps it reactive to
 * `TutorialProject.setConfig()`, which replaces the object.
 * @returns The current `TutorialProjectConfig` (embedded project type/root, `inEditorPath`, `copilotContext`).
 * @throws Error when the project has not been loaded (`config == null`).
 * Read by: `projectEditorHost`, `resolved`, `dirtyViews`, `openView`, `CourseEditor.vue#template`
 * (`config.project.root`, `config.inEditorPath`).
 * Called by: Vue (computed; re-evaluated when `props.project.config` changes)
 */
const config = computed(() => {
  // Read the config off the reactive project; `setConfig()` replaces the object, which re-triggers this computed.
  const config = props.project.config
  // Guard: the model must be loaded before the editor can render anything (the page guarantees this).
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})
/**
 * The component hosting the Project Editor for the embedded learner project, looked up by project type
 * (`spx` -> `SpxProjectEditorHost`). A computed so a config change picks the matching host.
 * @returns The host component rendered through `<component :is>`.
 * @throws Error (from `project/index.ts#getProjectEditorHost`) when the config names an unknown project type.
 * Read by: `CourseEditor.vue#template` (the always-mounted `<component :is="projectEditorHost">`).
 * Called by: Vue (computed; re-evaluated when `config.value.project.type` changes)
 */
const projectEditorHost = computed(() => getProjectEditorHost(config.value.project.type))

/**
 * The embedded Project Editor's `EditorState`, or null while the host has not initialized (or is re-initializing).
 * Written by: the project editor host through `v-model:editor-state` (`project/SpxProjectEditorHost.vue#setState`
 * emits `update:editorState`).
 * Read by: `CourseEditor.vue#template` (`EditorHistoryButtons` and `EditorModeSwitch` in the navbar).
 */
const editorState = shallowRef<EditorState | null>(null)

// The open view comes from the route, so it survives reloads and works with browser history.
/**
 * The in-Course-Editor path from the route, normalized from the `inCourseEditorPath` param (a string or string
 * array) to the `a/b/c` form; the empty string is the course itself.
 * @returns The normalized path string.
 * Read by: `resolved`, the watch that keeps the route on a view's own path.
 * Called by: Vue (computed; re-evaluated when the route param changes)
 */
const activePath = computed(() => segmentsToPath(paramToSegments(route.params[inCourseEditorPathParam])))
/**
 * The view `activePath` opens, and the path the route should say for it (`course-views.ts#resolveView`).
 * @returns `{ open, path }`.
 * Read by: `open`, the watch that keeps the route on a view's own path.
 * Called by: Vue (computed; re-evaluated when the project root or `activePath` changes)
 */
const resolved = computed(() => resolveView(activePath.value, config.value.project.root))
/**
 * The view on screen, and for the project the Project Editor's own path inside it.
 * @returns An `OpenView`.
 * Read by: the Copilot's open-document context, `CourseEditor.vue#template` (the activity bar, the view branches,
 * the navbar's project controls and the `active` flag of the project editor host).
 * Called by: Vue (computed; re-evaluated when `resolved` changes)
 */
const open = computed(() => resolved.value.open)
/**
 * Whether the current route is the preview route record (`course-editor-preview`) rather than the editing one.
 * @returns `true` while previewing.
 * Read by: the `watch(isPreviewRoute)` below, `enterPreviewFromRoute`, `CourseEditor.vue#template` (banner vs
 * navbar, preview vs editing pane, the project editor host's `active`).
 * Called by: Vue (computed; re-evaluated when `route.name` changes)
 */
const isPreviewRoute = computed(() => route.name === courseEditorPreviewRouteName)

// Tell the Copilot what course this is, what its program says and what the author has open, and start it with
// the course-authoring skill. Disposed with this component; silent while previewing, where the Copilot belongs
// to the learner's session and must see exactly what a learner's would.
useCourseEditorCopilot(
  () => props.project,
  () => open.value,
  () => isPreviewRoute.value
)

/**
 * The route params identifying this course (series id and course id inputs), reused for every navigation inside
 * the editor so both route records stay on the same course.
 * @returns `{ courseSeriesIdInput, courseIdInput }` copied from the current route.
 * Called by: `components/course-editor/CourseEditor.vue#openPath`,
 * `components/course-editor/CourseEditor.vue#handlePreview`
 */
function courseRouteParams() {
  return { courseSeriesIdInput: route.params.courseSeriesIdInput, courseIdInput: route.params.courseIdInput }
}

/**
 * Open a path of the course by navigating the editing route to it. Navigation (not local state) is the single way
 * to switch views, so the URL, browser history and the `open` computed always agree.
 * @param path - In-Course-Editor path to open; the empty string opens the course settings.
 * @param replace - Replace the current history entry instead of adding one.
 * @returns The navigation promise (settles once navigation is done; the leave guard lets same-course navigations
 * pass).
 * Called by: `components/course-editor/CourseEditor.vue#openView`, `components/course-editor/CourseEditor.vue#exitPreview`,
 * the watch that keeps the route on a view's own path.
 */
function openPath(path: string, replace = false) {
  // Always the editing route record (never the preview one), keeping the course params and encoding the path as
  // route segments.
  const location = {
    name: courseEditorRouteName,
    params: { ...courseRouteParams(), [inCourseEditorPathParam]: pathToSegments(path) }
  }
  return replace ? router.replace(location) : router.push(location)
}

/**
 * Open a view of the course, at the path it lives at.
 * @param view - The view chosen in the activity bar.
 * @returns The navigation promise.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`CourseActivityBar @select`).
 */
function openView(view: CourseView) {
  return openPath(getViewPath(view, config.value.project.root))
}

/**
 * Keep the route on the path of the view it shows. A path inside a view (a single video, as earlier versions of the
 * editor addressed one) or one no view edits (a file the course does not use) is shown by the view that takes it,
 * and the URL is brought in line, replacing the history entry, so it always says what is on screen. Only the
 * editing route: the preview's path belongs to the playground.
 * @param target - The view's own path when the route's differs, otherwise null.
 * Called by: Vue (watch, immediate)
 */
watch(
  () => (isPreviewRoute.value || resolved.value.path === activePath.value ? null : resolved.value.path),
  (target) => {
    if (target != null) void openPath(target, true)
  },
  { immediate: true }
)

/**
 * Whether this editor session is still mounted. Every await that can outlive the component (modals, snapshot
 * loads) checks it before touching the model or navigating: results that arrive after unmount are dropped.
 * Written by: `onUnmounted` (set to false). Read by: `isCurrentPreview`.
 */
let sessionAlive = true

// Track unsaved changes across everything the Tutorial project exports.
// `revision` tells a save whether edits happened after its snapshot was taken.
/**
 * Whether the working copy has changes not saved yet.
 * Written by: the `watch` on `exportFiles()` below (set), `save` (cleared when no edit happened meanwhile).
 * Read by: `confirmDiscardingUnsavedChanges`, `handleBeforeUnload`, `handleSaveShortcut`,
 * `CourseEditor.vue#template` (the "Unsaved" tag and the Save button's `:disabled`).
 */
const dirty = ref(false)
/**
 * Monotonic counter of exported-files changes; a save compares it before and after uploading to decide whether
 * `dirty` may be cleared.
 * Written by: the `watch` on `exportFiles()` below. Read by: `save`.
 */
const revision = ref(0)
/**
 * Mark the working copy dirty whenever the exported records change. `exportFiles()` reads every record of the
 * model (config, main course, embedded project, resources, extra files), so this one source captures all edits.
 * The callback ignores the new/old `Files` maps: only the fact that something changed matters.
 * @returns void; side effects: sets `dirty` and bumps `revision`.
 * Called by: Vue (watch on `props.project.exportFiles()`)
 */
watch(
  () => props.project.exportFiles(),
  () => {
    dirty.value = true
    revision.value++
  }
)

// Per-view unsaved marks for the activity bar: records are compared with the baseline taken at load and after
// every successful save, so a save made while editing still shows what remains unsaved. Generated records keep
// their identity while their source is unchanged, so comparing `File` instances is enough.
/**
 * The exported records as of the load or the last successful save; the reference point for per-view dirty marks.
 * Written by: setup (initial export), `save` (after a successful save). Read by: `changedPaths`.
 */
const filesBaseline = shallowRef<Files>(props.project.exportFiles())
/**
 * Paths whose record differs from the baseline (added, removed or replaced by another `File` instance).
 * @returns A `Set` of in-Course-Editor paths (see `course-views.ts#getChangedPaths`).
 * Read by: `dirtyViews`.
 * Called by: Vue (computed; re-evaluated when `filesBaseline` or any exported record changes)
 */
const changedPaths = computed(() => getChangedPaths(filesBaseline.value, props.project.exportFiles()))
/**
 * The views with unsaved changes (`course-views.ts#getDirtyViews`).
 * @returns A `Set` of views.
 * Read by: `CourseEditor.vue#template` (`CourseActivityBar :dirty-views`, which marks them with a dot).
 * Called by: Vue (computed; re-evaluated when `changedPaths` or the project root changes)
 */
const dirtyViews = computed(() => getDirtyViews(changedPaths.value, config.value.project.root))

// Saving blocks the editor (mask + route guards) so nothing changes underneath the upload. The abort
// controller is the safety net for the paths that bypass the guards (programmatic session end, page close):
// a save that outlives its session must never publish its stale snapshot.
/**
 * The abort controller of the save in flight, or null.
 * Written by: `handleSave` (set when a save starts, cleared when that same save finishes).
 * Read by: `onUnmounted` (aborts a save that outlives the component).
 */
let saveController: AbortController | null = null

/**
 * Persist the working copy: snapshot the files, upload them, patch the course content, then reset the dirty
 * tracking and refresh metadata edited elsewhere. Only the content is written; title and thumbnail belong to
 * course management.
 * @param signal - Abort signal owned by `handleSave`; aborting cancels the uploads and the PATCH and keeps a stale
 * snapshot from being published after unmount.
 * @returns Promise<void>; side effects: network writes, clears `dirty` (when nothing changed meanwhile), replaces
 * `filesBaseline`, sets the project metadata, emits `saved`.
 * @throws Whatever `saveFiles` / `updateCourse` reject with, or the abort reason via `signal.throwIfAborted()`.
 * Called by: `components/course-editor/CourseEditor.vue#handleSave`
 */
async function save(signal: AbortSignal) {
  // Take a consistent snapshot (waits for in-flight transactions of the embedded project to finish)...
  const { files } = await props.project.snapshot()
  // ...and remember which revision it corresponds to, so edits made during the upload are not mistaken as saved.
  const savedRevision = revision.value
  // Upload every record to cloud storage; yields the path -> file-id collection the backend stores.
  const { fileCollection } = await saveFiles(files, signal)
  // Bail out before publishing if the save was aborted (unmount / session end) while uploading.
  signal.throwIfAborted()
  // Only the content is edited here; title and thumbnail belong to course management and are left untouched.
  const saved = (await updateCourse(props.course.id, { content: fileCollection }, signal)) as PlaygroundCourse
  // Clear the global dirty flag only if no edit happened after the snapshot; otherwise those edits stay unsaved.
  if (revision.value === savedRevision) dirty.value = false
  // The saved snapshot becomes the baseline for per-view marks (records edited since keep their dot).
  filesBaseline.value = files
  // Pick up metadata edited elsewhere in the meantime.
  props.project.setMetadata({ title: saved.title, thumbnail: saved.thumbnail })
  // Tell the page so its session holds the fresh course object.
  emit('saved', saved)
}

/**
 * User-facing save action: runs `save` under a "Saving course..." loading toast with a fresh `AbortController`,
 * reports failure or success as a toast (via `useMessageHandle`) and exposes `isLoading` (see `saving`).
 * @returns Promise<void>; side effects: sets/clears `saveController`, plus everything `save` does.
 * Called by: `components/course-editor/CourseEditor.vue#template` (Save button `@click="handleSave.fn"`),
 * `components/course-editor/CourseEditor.vue#handleSaveShortcut`
 */
const handleSave = useMessageHandle(
  async () => {
    // One controller per save so unmount can abort exactly the save in flight.
    const controller = new AbortController()
    saveController = controller
    try {
      // Show the loading toast while the save runs; the mask in the template blocks interaction meanwhile.
      await m.withLoading(save(controller.signal), t({ en: 'Saving course...', zh: '保存课程中...' }))
    } finally {
      // Clear only if no newer save replaced the controller (defensive; the mask prevents overlapping saves).
      if (saveController === controller) saveController = null
    }
  },
  { en: 'Failed to save course', zh: '保存课程失败' },
  { en: 'Course saved', zh: '课程已保存' }
)
/**
 * Whether a save is in flight (alias of `handleSave.isLoading`).
 * @returns `true` while saving.
 * Read by: `confirmDiscardingUnsavedChanges`, `handleBeforeUnload`, `handleSaveShortcut`,
 * `CourseEditor.vue#template` (saving mask `:visible`, Preview button `:disabled`, Save button `:loading`).
 * Called by: Vue (computed; re-evaluated when `handleSave.isLoading` changes)
 */
const saving = computed(() => handleSave.isLoading.value)

// Preview runs the real Tutorial lifecycle on a snapshot of the author's current work, so learner-side
// edits and course execution never touch the working copy. It lives on its own route (the playground drives
// that route's `inEditorPath`); entering and leaving it, also through browser history, drives the state below.
/**
 * The snapshot `TutorialProject` the playground runs, or null when not previewing or still loading. A separate
 * instance, so learner-side edits and course execution never touch the working copy.
 * Written by: `handlePreview`, `enterPreviewFromRoute`, the `watch(isPreviewRoute)` (cleared when leaving).
 * Read by: that same watch (to avoid loading twice), `CourseEditor.vue#template` (`CoursePlayground :project`).
 */
const preview = shallowRef<TutorialProject | null>(null)
/**
 * The error that kept the preview from starting or running, or null.
 * Written by: `handlePreview` and `enterPreviewFromRoute` (cleared on success, set on failure by the latter),
 * `handlePreviewFailed`, the `watch(isPreviewRoute)` (cleared when leaving).
 * Read by: `CourseEditor.vue#template` (`UIError` branch of the preview pane).
 */
const previewError = ref<Error | null>(null)

// A preview is a walk along the series: it starts at the course being edited and "Learn next course" in the
// completion modal moves it on, the way a learner goes from one course to the next. Only the course being
// edited has a working copy; the ones after it are shown as they were saved.
/**
 * The course the preview is showing, or trying to show. A failed load leaves it on the course that failed, so
 * `retryPreview` retries that one instead of starting the walk over.
 * Written by: `previewSavedCourse`, the `watch(isPreviewRoute)` (reset when entering).
 * Read by: `retryPreview`.
 */
const previewCourseID = ref(props.course.id)
/**
 * The course the preview is running, assigned only once its snapshot loaded. Feeds the completion modal: its
 * title, and the position in the series that decides whether there is a next course.
 * Written by: `previewSavedCourse`, the `watch(isPreviewRoute)` (reset when entering).
 * Read by: `handlePreviewCompleted`, `nextCourseID`.
 */
const previewCourse = shallowRef<PlaygroundCourse>(props.course)
/**
 * Full path of the editing route the author was on when Preview was clicked, so "Back to editor" returns there;
 * null when the preview was entered by URL or history.
 * Written by: `handlePreview`, `exitPreview` (consumed). Read by: `exitPreview`.
 */
let routeBeforePreview: string | null = null

/**
 * Generation counter of preview loads. Starting a load takes the next number; leaving the preview bumps it. A load
 * whose number is no longer current when it finishes was superseded (exit, re-enter, unmount) and is discarded.
 * Written by: `handlePreview`, `enterPreviewFromRoute`, `previewSavedCourse` (take), the `watch(isPreviewRoute)`
 * (bump on leave), `onUnmounted` (bump).
 * Read by: `isCurrentPreview`, `handlePreviewCompleted` (takes it before opening the completion modal).
 */
let previewGeneration = 0

/**
 * Whether work started for preview generation `generation` still belongs to the preview on screen: the editor is
 * still mounted, and neither leaving the preview nor a later load has moved on since. What a preview the author has
 * left produces -- a snapshot, a failed load, the answer to its completion modal -- must not reach the one they are
 * in now, including when it is the same course entered again.
 * @param generation - The generation taken when the work started.
 * @returns `true` while that preview is the one on screen.
 * Called by: `loadPreviewSnapshot`, `loadSavedCourseSnapshot`, `enterPreviewFromRoute`, `previewSavedCourse`,
 * `handlePreviewCompleted`.
 */
function isCurrentPreview(generation: number) {
  return sessionAlive && generation === previewGeneration
}

/**
 * Build a fresh `TutorialProject` loaded from a snapshot of the working copy, for the playground to run. The
 * snapshot's embedded `SpxProject` carries watchers, so whoever ends up not delivering it must dispose it: a
 * failed load and a superseded load are disposed here; a delivered one is disposed by `CoursePlayground` when it
 * unmounts.
 * @param generation - The preview generation this load belongs to (see `previewGeneration`).
 * @throws Cancelled when the session ended or the generation was superseded while loading (the snapshot is
 * disposed first); rethrows load errors after disposing.
 * @returns Promise resolving to the loaded snapshot project.
 * Called by: `components/course-editor/CourseEditor.vue#handlePreview`,
 * `components/course-editor/CourseEditor.vue#enterPreviewFromRoute`
 */
async function loadPreviewSnapshot(generation: number) {
  // A new instance, loaded from the exported metadata + files of the author's project.
  const snapshot = new TutorialProject()
  try {
    await snapshot.load(await props.project.snapshot())
  } catch (error) {
    // Nobody will receive this snapshot: release its embedded project before reporting the failure.
    snapshot.project.dispose()
    throw error
  }
  // Superseded or orphaned: the author left the preview (or the editor) while the snapshot loaded.
  if (!isCurrentPreview(generation)) {
    snapshot.project.dispose()
    throw new Cancelled('preview superseded')
  }
  return snapshot
}

/**
 * Preview button action: load a snapshot, publish it to `preview`, remember the current route and navigate to the
 * preview route. Loading before navigating means the `watch(isPreviewRoute)` finds `preview` already set and
 * does not load a second snapshot.
 * @returns Promise<void>; side effects: sets `preview`, clears `previewError`, sets `routeBeforePreview`,
 * navigates to the preview route.
 * Called by: `components/course-editor/CourseEditor.vue#template` (Preview button `@click="handlePreview.fn"`;
 * its `isLoading` drives the button's `:loading`)
 */
const handlePreview = useMessageHandle(
  async () => {
    // Snapshot first: if loading fails the toast reports it and the route is left untouched. A superseded load
    // rejects with `Cancelled`, which the wrapper swallows.
    const snapshot = await loadPreviewSnapshot(++previewGeneration)
    previewError.value = null
    preview.value = snapshot
    // Remember where to come back to, then switch to the preview route record with an empty in-editor path
    // (the playground replaces it with the configured `inEditorPath` when it initializes).
    routeBeforePreview = route.fullPath
    await router.push({ name: courseEditorPreviewRouteName, params: { ...courseRouteParams(), inEditorPath: [] } })
  },
  { en: 'Failed to start preview', zh: '启动预览失败' }
)

/**
 * Start a preview because the preview route became current without `handlePreview` (typed URL, reload, browser
 * history, or retry after an error): load a snapshot and publish it unless the route changed meanwhile. Errors
 * are shown in place (`previewError`) rather than as a toast, since no button triggered this.
 * @returns Promise<void>; side effects: sets `preview` on success or `previewError` on failure.
 * Called by: the `watch(isPreviewRoute)` below, `components/course-editor/CourseEditor.vue#template`
 * (`UIError :retry` in the preview pane)
 */
async function enterPreviewFromRoute() {
  const generation = ++previewGeneration
  try {
    // Leaving the preview route bumps the generation (see the watch below), so a load that finishes after the
    // author left is discarded by `loadPreviewSnapshot` itself.
    const snapshot = await loadPreviewSnapshot(generation)
    previewError.value = null
    preview.value = snapshot
  } catch (error) {
    // Only the preview on screen shows its errors: a load superseded while it ran (`Cancelled`), or one that failed
    // only after the author had left it, would otherwise replace a preview that is running fine.
    if (error instanceof Cancelled || !isCurrentPreview(generation)) return
    // Normalize non-Error throwables so the template can always show `.message`.
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Load a saved course of the series into a snapshot the playground can run. These come from the server exactly
 * as learners get them: only the course being edited is previewed from unsaved work.
 * @param courseID - The course to load, taken from `series.courseIDs`.
 * @param generation - The preview generation this load belongs to (see `previewGeneration`).
 * @throws `DefaultException` when the course is not a Playground Course; `Cancelled` when the session ended or
 * the generation was superseded while loading (the snapshot is disposed first); rethrows load errors.
 * @returns Promise resolving to the course and its loaded snapshot.
 * Called by: `components/course-editor/CourseEditor.vue#previewSavedCourse`
 */
async function loadSavedCourseSnapshot(courseID: string, generation: number) {
  const course = await getCourse(courseID)
  // A series holds courses of one kind, so this only fires on data the playground could not run anyway.
  if (course.kind !== 'playground') {
    throw new DefaultException({
      en: `Course "${course.title}" is not a Playground Course`,
      zh: `课程"${course.title}"不是目标式课程`
    })
  }
  const snapshot = await TutorialProject.load(course)
  // Superseded or orphaned: the author left the preview (or the editor) while the course loaded.
  if (!isCurrentPreview(generation)) {
    snapshot.project.dispose()
    throw new Cancelled('preview superseded')
  }
  return { course, snapshot }
}

/**
 * Show a saved course of the series: release the finished one, then load and publish the next. Failures are
 * shown in the preview pane rather than as a toast, since the author is inside a walk rather than at a button.
 * @param courseID - The course of the series to show.
 * @returns Promise<void>; side effects: sets `previewCourseID`, then `preview` and `previewCourse` on success or
 * `previewError` on failure.
 * Called by: `components/course-editor/CourseEditor.vue#handlePreviewCompleted`,
 * `components/course-editor/CourseEditor.vue#retryPreview`
 */
async function previewSavedCourse(courseID: string) {
  const generation = ++previewGeneration
  previewCourseID.value = courseID
  previewError.value = null
  // Drop the finished course before loading the next: `CoursePlayground` disposes the snapshot it was given when
  // it unmounts, and `nextTick` lets that happen before this load can publish another one.
  preview.value = null
  await nextTick()
  try {
    const { course, snapshot } = await loadSavedCourseSnapshot(courseID, generation)
    previewCourse.value = course
    preview.value = snapshot
  } catch (error) {
    // Only the preview on screen shows its errors (see `enterPreviewFromRoute`).
    if (error instanceof Cancelled || !isCurrentPreview(generation)) return
    // Normalize non-Error throwables so the template can always show `.message`.
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Retry whatever the preview pane failed to show: the author's working copy at the start of a walk, or the
 * saved course the walk had reached.
 * @returns Promise<void>.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`UIError :retry` in the preview pane)
 */
function retryPreview() {
  if (previewCourseID.value === props.course.id) return enterPreviewFromRoute()
  return previewSavedCourse(previewCourseID.value)
}

/**
 * The course after the previewed one in the series, or null at its end (also when the previewed course is no
 * longer in the series that was loaded with the editor).
 * @returns The next course's id, or null.
 * Called by: `components/course-editor/CourseEditor.vue#handlePreviewCompleted`
 */
function nextCourseID(): string | null {
  const ids = props.series.courseIDs
  const index = ids.indexOf(previewCourse.value.id)
  if (index < 0 || index === ids.length - 1) return null
  return ids[index + 1]
}

/**
 * What the preview banner says: which course is on screen, or a plain sentence while one is being prepared. The
 * title comes from the snapshot, so the course being edited is named by its unsaved title.
 * @returns A `LocaleMessage` for `$t`.
 * Read by: `CourseEditor.vue#template` (the preview banner).
 * Called by: Vue (computed; re-evaluated when the snapshot or its title changes)
 */
const previewBannerText = computed(() => {
  const title = preview.value?.title
  if (title == null) return { en: 'Previewing the course as a learner', zh: '正在以学习者视角预览课程' }
  return { en: `Previewing "${title}" as a learner`, zh: `正在以学习者视角预览"${title}"` }
})

/**
 * The author's copilot conversation and panel state, stashed while a preview runs. The playground's runner takes
 * the copilot over with the learner's session (`startSession` ends whatever is current), so the author's session
 * is exported before the playground mounts and restored after the preview is left.
 * Written by: `stashAuthorCopilot` / `restoreAuthorCopilot`. Read by: `restoreAuthorCopilot`.
 */
let authorCopilot: { session: SessionExported | null; active: boolean } | null = null

/**
 * Stash the author's copilot session and panel state before the preview takes the copilot over. Idempotent
 * while a preview is running.
 * @returns void; side effects: sets `authorCopilot`.
 * Called by: the `watch(isPreviewRoute)` below (entering the preview)
 */
function stashAuthorCopilot() {
  if (authorCopilot != null) return
  authorCopilot = { session: copilot.exportCurrentSession(), active: copilot.active }
}

/**
 * Give the author their copilot back after a preview: restore the stashed session (or end the learner's, when the
 * author had none) and put the panel back the way it was. The runner ends its own session on dispose only if it
 * is still current, so restoring first is safe.
 * @returns void; side effects: replaces the copilot's current session, opens or closes the panel, clears
 * `authorCopilot`.
 * Called by: the `watch(isPreviewRoute)` below (leaving the preview), `onUnmounted`
 */
function restoreAuthorCopilot() {
  const stashed = authorCopilot
  if (stashed == null) return
  authorCopilot = null
  if (stashed.session != null) copilot.restoreSession(stashed.session)
  else copilot.endCurrentSession()
  if (stashed.active) copilot.open()
  else copilot.close()
}

/**
 * Keep the preview state in step with the route: leaving the preview route drops the snapshot and the error and
 * gives the author their copilot back; entering it stashes the author's copilot and, without a snapshot
 * (URL / history), loads one. `immediate` covers landing directly on the preview URL.
 * @param isPreview - New value of `isPreviewRoute`.
 * @returns void; side effects: clears `preview` / `previewError` and restores the copilot, or stashes the copilot
 * and kicks off `enterPreviewFromRoute`.
 * Called by: Vue (watch on `isPreviewRoute`, immediate)
 */
watch(
  isPreviewRoute,
  (isPreview) => {
    // Leaving the preview (Back to editor, history, completion modal): release the snapshot so the playground
    // unmounts and disposes its project, and bring the author's copilot back.
    if (!isPreview) {
      // Any load still in flight belongs to a preview that is over: let it discard its snapshot.
      previewGeneration++
      preview.value = null
      previewError.value = null
      restoreAuthorCopilot()
      return
    }
    // Entering the preview: this runs before the playground mounts and its runner replaces the copilot session.
    stashAuthorCopilot()
    // Every preview starts at the course being edited; the completion modal walks on from there.
    previewCourseID.value = props.course.id
    previewCourse.value = props.course
    // `handlePreview` already set the snapshot; otherwise load it from the route.
    if (preview.value == null) void enterPreviewFromRoute()
  },
  { immediate: true }
)

/**
 * Leave the preview: go back to the editing route the author came from, or to the course root when the preview
 * was entered by URL / history and there is nothing to return to.
 * @returns The `router.push` promise.
 * Called by: `components/course-editor/CourseEditor.vue#template` ("Back to editor" button `@click`),
 * `components/course-editor/CourseEditor.vue#handlePreviewCompleted`
 */
function exitPreview() {
  // Consume the remembered route so a later, URL-entered preview does not reuse a stale target.
  const target = routeBeforePreview
  routeBeforePreview = null
  if (target != null) return router.push(target)
  return openPath('')
}

/**
 * The previewed course finished: show the completion modal a learner would see (with the course's feedback),
 * then stay in the preview ("continue editing"), walk on to the next course of the series ("next"), or leave.
 * @param completion - Completion payload from the playground runner (`feedback` text or null).
 * @returns Promise<void>; side effects: opens a modal, may replace the previewed course or navigate out of the
 * preview.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`CoursePlayground @course-completed`)
 */
async function handlePreviewCompleted(completion: PlaygroundCourseCompletion) {
  // The preview this completion belongs to. The modal outlives it: stepping out of the preview (the browser's Back
  // button does not close the modal) and into it again leaves the modal open over a preview it knows nothing of.
  const generation = previewGeneration
  // The modal resolves with the chosen action ('continueEditing' | 'next' | 'exit').
  const action = await openCompletion({
    course: previewCourse.value,
    series: props.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return
  // An answer about a preview no longer on screen -- the editor has gone, or the author left that preview, whether
  // or not they have entered another since -- must neither walk on nor end the one they are in.
  if (!isCurrentPreview(generation)) return
  // "Next" continues the walk; at the end of the series the modal offers no next course, so this leaves.
  const next = action === 'next' ? nextCourseID() : null
  if (next != null) return previewSavedCourse(next)
  await exitPreview()
}

/**
 * The playground reported a failure of the course program: show it in place of the playground.
 * @param error - The error raised by the playground course runner.
 * @returns void; side effect: sets `previewError`.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`CoursePlayground @failed`)
 */
function handlePreviewFailed(error: Error) {
  previewError.value = error
}

/**
 * Decide whether the author may leave the course editor: never while saving (a warning toast is shown), freely
 * when nothing is unsaved, otherwise after confirming in a dialog.
 * @returns `false` while saving, `true` when clean, or a `Promise<boolean>` resolving to the dialog result
 * (`true` = leave). Both shapes are valid navigation-guard return values.
 * Called by: the `router.beforeEach` leave guard below (`stopLeaveGuard`)
 */
function confirmDiscardingUnsavedChanges() {
  // Guard: leaving mid-save could publish a stale snapshot or lose the result; block and explain.
  if (saving.value) {
    m.warning(t({ en: 'The course is being saved, please wait', zh: '课程正在保存，请稍候' }))
    return false
  }
  // Nothing to lose: allow the navigation without asking.
  if (!dirty.value) return true
  // Ask; the dialog resolves `true` on "Leave" and `false` on "Keep editing" (cancel is mapped to false).
  return confirm({
    title: t({ en: 'Leave course editor', zh: '离开课程编辑器' }),
    content: t({
      en: 'Unsaved changes to the course will be lost if you leave now. Are you sure to leave?',
      zh: '若现在离开，课程的未保存修改将会丢失。确定要离开吗？'
    }),
    cancelText: t({ en: 'Keep editing', zh: '继续编辑' }),
    confirmText: t({ en: 'Leave', zh: '离开' })
  })
}

/**
 * Whether a route location belongs to this editing session: one of the two course-editor route records for the
 * same series and course inputs. Document switches and the preview are therefore "inside" the session.
 * @param location - The route location to test (`to` or `from` of a navigation).
 * @returns `true` when the location is this course's editor or preview route.
 * Called by: the `router.beforeEach` leave guard below (`stopLeaveGuard`)
 */
function isThisCourseEditor(location: RouteLocationNormalizedGeneric) {
  const name = location.name
  return (
    (name === courseEditorRouteName || name === courseEditorPreviewRouteName) &&
    location.params.courseSeriesIdInput === route.params.courseSeriesIdInput &&
    location.params.courseIdInput === route.params.courseIdInput
  )
}

// Editing, preview and document switches of this course are the same session; only leaving it asks about
// unsaved changes. A global guard is used because the session spans two route records.
/**
 * Global leave guard: asks about unsaved changes only when navigating from this course's editor/preview to
 * anywhere else (another page, another course). `stopLeaveGuard` is the unsubscribe function, called on unmount.
 * @param to - Target route location.
 * @param from - Current route location.
 * @returns `true` to allow, or the result of `confirmDiscardingUnsavedChanges` (`false` / boolean promise).
 * Called by: vue-router before every navigation (registered with `router.beforeEach`; removed by `onUnmounted`)
 */
const stopLeaveGuard = router.beforeEach((to, from) => {
  // Navigations that start outside this session, or stay within it (document switch, preview), pass through.
  if (!isThisCourseEditor(from) || isThisCourseEditor(to)) return true
  // Leaving the session: block while saving, or confirm when dirty.
  return confirmDiscardingUnsavedChanges()
})

/**
 * Ask the browser to show its "leave site?" prompt when closing or reloading the tab with unsaved changes or a
 * save in flight (the router guard cannot intercept those).
 * @param event - The `beforeunload` event; calling `preventDefault()` triggers the browser prompt.
 * @returns void.
 * Called by: the browser (`window` `beforeunload` event, registered in `onMounted`)
 */
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) event.preventDefault()
}

/**
 * Keyboard shortcut: Cmd/Ctrl+S saves the course (when dirty and not already saving) and always suppresses the
 * browser's own "save page" dialog while the editor is open.
 * @param event - The `keydown` event on `window`.
 * @returns void; side effect: may start `handleSave`.
 * Called by: the browser (`window` `keydown` event, registered in `onMounted`)
 */
function handleSaveShortcut(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  // command/ctrl + s
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    // Always swallow the browser default, even when there is nothing to save.
    event.preventDefault()
    // Same conditions as the Save button (`:disabled="!dirty"`, `:loading="saving"`).
    if (dirty.value && !saving.value) handleSave.fn()
  }
}

/**
 * Register the window-level listeners (unload prompt, save shortcut).
 * @returns void.
 * Called by: Vue lifecycle (onMounted)
 */
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleSaveShortcut)
})

/**
 * Tear down: remove the window listeners, unregister the global leave guard and abort a save still in flight so it
 * never publishes a snapshot of a session that no longer exists (page switched course, or the page unmounted).
 * @returns void.
 * Called by: Vue lifecycle (onUnmounted)
 */
onUnmounted(() => {
  // Anything still awaited (modals, snapshot loads) sees this and drops its result.
  sessionAlive = false
  // A preview load in flight is orphaned too.
  previewGeneration++
  // Leaving the editor from the preview route: the author's copilot must not stay replaced by the learner's.
  restoreAuthorCopilot()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleSaveShortcut)
  // The guard is router-global, so it must be removed explicitly.
  stopLeaveGuard()
  // `Cancelled` is the abort reason, so a rejection surfaced through `signal.reason` is treated as a
  // cancellation by `useMessageHandle` (no error toast).
  saveController?.abort(new Cancelled('unmounted'))
})
</script>

<template>
  <!-- Root of the editor: a full-height column (header + main); `relative` anchors the saving mask. -->
  <section
    v-radar="{
      name: 'course-editor',
      desc: 'Editor for a Playground Course: its views, the open one and the preview'
    }"
    class="relative min-h-full w-full flex flex-col bg-grey-300"
  >
    <!-- Saving mask: covers everything (z-50) while `saving`, so nothing is edited or clicked under the upload. -->
    <UILoading
      v-radar="{ name: 'saving-mask', desc: 'Covers the editor while the course is being saved' }"
      class="z-50"
      cover
      :visible="saving"
    />
    <!-- Header: the preview banner while on the preview route, otherwise the editor navbar. -->
    <header class="flex-none">
      <!-- Preview banner (`isPreviewRoute`): says the course is shown as a learner sees it; "Back to editor"
           calls `exitPreview`. -->
      <div
        v-if="isPreviewRoute"
        v-radar="{
          name: 'preview-banner',
          desc: 'Shows that the course is being previewed, with a button to go back to the editor'
        }"
        class="flex items-center gap-3 bg-primary-100 px-4 py-1 text-sm"
      >
        <span class="flex-1 truncate">{{ $t(previewBannerText) }}</span>
        <UIButton
          v-radar="{ name: 'back-to-editor-button', desc: 'Click to stop previewing and return to the course editor' }"
          type="secondary"
          size="small"
          @click="exitPreview"
        >
          {{ $t({ en: 'Back to editor', zh: '返回编辑器' }) }}
        </UIButton>
      </div>
      <!-- Editor navbar (not previewing): three slots of `NavbarWrapper`. -->
      <NavbarWrapper v-else>
        <!-- Left slot: undo/redo of the embedded Project Editor, only while the project is open. -->
        <template #left>
          <EditorHistoryButtons v-if="open.view === 'project'" :state="editorState" />
        </template>
        <!-- Center slot: course title, series title, and the "Unsaved" tag driven by `dirty`. -->
        <template #center>
          <div
            v-radar="{
              name: 'course-title',
              desc: 'Title of the course being edited, its series and unsaved state'
            }"
            class="flex min-w-0 items-center gap-2"
          >
            <span class="truncate font-semibold">{{ project.title }}</span>
            <span class="truncate text-sm text-grey-700">{{ series.title }}</span>
            <UITag v-if="dirty">{{ $t({ en: 'Unsaved', zh: '未保存' }) }}</UITag>
          </div>
        </template>
        <!-- Right slot: Project Editor mode switch (project only), then the Preview and Save buttons.
             Preview is disabled while saving; Save is disabled while clean and shows a spinner while saving. -->
        <template #right>
          <EditorModeSwitch v-if="open.view === 'project'" :state="editorState" />
          <UIButton
            v-radar="{ name: 'preview-button', desc: 'Click to preview the course as a learner' }"
            class="mr-2"
            type="secondary"
            size="small"
            :disabled="saving"
            :loading="handlePreview.isLoading.value"
            @click="handlePreview.fn"
          >
            {{ $t({ en: 'Preview', zh: '预览' }) }}
          </UIButton>
          <UIButton
            v-radar="{ name: 'save-button', desc: 'Click to save the course' }"
            class="mr-3"
            type="primary"
            size="small"
            :disabled="!dirty"
            :loading="saving"
            @click="handleSave.fn"
          >
            {{ $t({ en: 'Save', zh: '保存' }) }}
          </UIButton>
        </template>
      </NavbarWrapper>
    </header>
    <!-- Body: the activity bar along the left edge (not while previewing), then the main area. -->
    <div class="flex-[1_1_0] flex min-h-0">
      <!-- Activity bar: one button per view; `select(view)` navigates via `openView`. -->
      <CourseActivityBar v-if="!isPreviewRoute" :open="open.view" :dirty-views="dirtyViews" @select="openView" />
      <!-- Main area: a column while previewing (the playground fills it), otherwise a padded row holding the open
           view. The project editor host at the end is mounted in both cases. -->
      <main class="flex-[1_1_0] flex min-w-0" :class="isPreviewRoute ? 'flex-col' : 'gap-xl p-4 pt-2'">
        <!-- Preview pane (`isPreviewRoute`): an error with retry, the playground once the snapshot is ready, or a
             loading placeholder while `enterPreviewFromRoute` runs. -->
        <template v-if="isPreviewRoute">
          <UIError v-if="previewError != null" class="flex-1" :retry="retryPreview">
            {{ previewError.message }}
          </UIError>
          <!-- The playground runs the snapshot project; `course-completed` and `failed` are handled above. -->
          <CoursePlayground
            v-else-if="preview != null"
            :project="preview"
            @course-completed="handlePreviewCompleted"
            @failed="handlePreviewFailed"
          />
          <!-- No snapshot and no error yet: the preview is still being prepared. -->
          <UIDetailedLoading v-else class="flex-1" :percentage="0">
            <span>{{ $t({ en: 'Preparing preview...', zh: '准备预览中...' }) }}</span>
          </UIDetailedLoading>
        </template>
        <!-- The open view, in a card; the project is not in here, its UI is the always-mounted host below. -->
        <UICard v-else-if="open.view !== 'project'" class="min-w-0 flex-[1_1_0] flex flex-col overflow-hidden">
          <!-- The course: its settings, stored in `index.json`. -->
          <CourseConfigDoc v-if="open.view === 'course'" :project="project" />
          <!-- Videos or pictures: a grid of cards, and where they are added. Keyed so each page starts fresh. -->
          <CourseResourceGrid
            v-else-if="open.view === 'videos' || open.view === 'images'"
            :key="open.view"
            :project="project"
            :view="open.view"
          />
          <!-- The course program (`main_course.gox`): a text editor bound directly to `project.mainCourse.code`. -->
          <CourseTextDoc
            v-else
            :text="project.mainCourse.code"
            language="xgo"
            @update:text="(text) => project.mainCourse.setCode(text)"
          />
        </UICard>
        <!-- Always mounted: the author's editor state outlives view switches and the preview. -->
        <!-- The host renders the Project Editor UI only while `active` (editing route + project open) but keeps its
             `EditorState` alive otherwise; it reports that state through `v-model:editor-state`, and it opens
             `config.inEditorPath` the first time the project is shown without a path in the route. -->
        <component
          :is="projectEditorHost"
          v-model:editor-state="editorState"
          :project="project.project"
          :root-path="config.project.root"
          :initial-path="config.inEditorPath"
          :active="!isPreviewRoute && open.view === 'project'"
        />
      </main>
    </div>
  </section>
</template>
