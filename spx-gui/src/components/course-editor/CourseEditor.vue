<script setup lang="ts">
/**
 * Purpose: The Course Editor for one Playground Course. It renders the course explorer (left), one document at a
 * time (right) and the always-mounted Project Editor host for the embedded learner project; it owns saving,
 * unsaved-change tracking, the route-driven learner preview and the leave guards. The open document is derived
 * from the route (`inCourseEditorPath` param), never from local state, so it survives reloads and browser history.
 *
 * Props:
 * - `course`: the Playground Course being edited (its id is used by `updateCourse`; title/thumbnail feed the
 *   preview completion modal).
 * - `series`: the course series the course belongs to (shown in the navbar, given to the completion modal).
 * - `project`: the author's working copy of the Tutorial project; the page owns its lifecycle (load / dispose).
 *
 * Emits:
 * - `saved(course)`: the `PlaygroundCourse` returned by the backend after a successful save. Listened by
 *   `apps/xbuilder/pages/course-editor/index.vue#handleSaved`, which stores it in the editing session.
 *
 * Used by: `apps/xbuilder/pages/course-editor/index.vue#template` (rendered once the session is loaded, keyed by
 * `session.course.id`).
 *
 * Uses: CourseExplorer, CourseConfigDoc, CourseFolderDoc, CourseResourceDoc, CourseTextDoc, CourseFileDoc,
 * CourseUploadModal (through `useModal`), CoursePlayground and CoursePlaygroundCompletionModal (preview),
 * EditorHistoryButtons / EditorModeSwitch / NavbarWrapper (navbar), the project editor host resolved from
 * `./project` (`SpxProjectEditorHost`), the `TutorialProject` model, `saveFiles` + `updateCourse` (persistence)
 * and the helpers in `./course-tree`, `./route` and `./upload`.
 */
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedGeneric } from 'vue-router'
import { Cancelled, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { updateCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseEditorPreviewRouteName, courseEditorRouteName } from '@/apps/xbuilder/router'
import { saveFiles } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
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
  UIEmpty,
  UIError,
  UILoading,
  UITag,
  useConfirmDialogWithResult,
  useMessage,
  useModal
} from '@/components/ui'
import CourseExplorer from './CourseExplorer.vue'
import CourseConfigDoc from './CourseConfigDoc.vue'
import CourseFileDoc from './CourseFileDoc.vue'
import CourseFolderDoc from './CourseFolderDoc.vue'
import CourseTextDoc from './CourseTextDoc.vue'
import CourseUploadModal from './CourseUploadModal.vue'
import CourseResourceDoc from './CourseResourceDoc.vue'
import { getProjectEditorHost } from './project'
import { dirname, inCourseEditorPathParam, paramToSegments, pathToSegments, segmentsToPath } from './route'
import { buildCourseTree, getChangedPaths, nearestExistingPath, resolveCourseDoc } from './course-tree'
import { addUploadedFiles, validateUploadDir } from './upload'

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

// Composables: i18n, toast messages, the current route/router (the open document lives in the route), a confirm
// dialog resolving to a boolean, and the two programmatic modals (preview completion, upload target picker).
const { t } = useI18n()
const m = useMessage()
const route = useRoute()
const router = useRouter()
const confirm = useConfirmDialogWithResult()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const openUploadModal = useModal(CourseUploadModal)

/**
 * The Tutorial project's config (`index.json`), narrowed to non-null: the page only renders this component once
 * the project is loaded, so readers need not null-check it. Reading `props.project.config` keeps it reactive to
 * `TutorialProject.setConfig()`, which replaces the object.
 * @returns The current `TutorialProjectConfig` (embedded project type/root, `inEditorPath`, `copilotContext`).
 * @throws Error when the project has not been loaded (`config == null`).
 * Read by: `projectEditorHost`, `doc`, `CourseEditor.vue#template` (`config.project.root`, `config.inEditorPath`).
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

// The explorer tree is a projection of the project's records, and the open node comes from the route (so it
// survives reloads and works with browser history).
/**
 * The course explorer tree built from the Tutorial project's records (see `course-tree.ts#buildCourseTree`).
 * @returns The sorted top-level `CourseNode[]` (folders, the project node, resource packages, files).
 * Read by: `doc`, `handleUpload` (passed to the upload modal), `CourseEditor.vue#template` (`CourseExplorer`
 * `:tree`, `nearestExistingPath(tree, ...)` after a file deletion).
 * Called by: Vue (computed; re-evaluated when any record read by `buildCourseTree` changes)
 */
const tree = computed(() => buildCourseTree(props.project))
/**
 * The in-Course-Editor path of the open node, normalized from the `inCourseEditorPath` route param (a string or
 * string array) to the `a/b/c` form; the empty string is the course itself.
 * @returns The normalized path string.
 * Read by: `doc`, `CourseEditor.vue#template` (`CourseExplorer` `:active-path`, `dirname(activePath)` on deletion).
 * Called by: Vue (computed; re-evaluated when the route param changes)
 */
const activePath = computed(() => segmentsToPath(paramToSegments(route.params[inCourseEditorPathParam])))
/**
 * What the right pane shows for `activePath`: the course root, the embedded project (carrying the Project
 * Editor's in-editor tail), one tree node, or `missing` when the path names nothing in the tree.
 * @returns A `CourseDoc` discriminated union (see `course-tree.ts#resolveCourseDoc`).
 * Read by: `proposedUploadDir`, `CourseEditor.vue#template` (every `doc.type` / `doc.node.type` branch and the
 * `active` flag of the project editor host).
 * Called by: Vue (computed; re-evaluated when `tree`, the project root or `activePath` changes)
 */
const doc = computed(() => resolveCourseDoc(tree.value, config.value.project.root, activePath.value))
/**
 * Whether the current route is the preview route record (`course-editor-preview`) rather than the editing one.
 * @returns `true` while previewing.
 * Read by: the `watch(isPreviewRoute)` below, `enterPreviewFromRoute`, `CourseEditor.vue#template` (banner vs
 * navbar, preview vs editing pane, the project editor host's `active`).
 * Called by: Vue (computed; re-evaluated when `route.name` changes)
 */
const isPreviewRoute = computed(() => route.name === courseEditorPreviewRouteName)

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
 * Open a node of the course explorer by navigating the editing route to its path. Navigation (not local state) is
 * the single way to switch documents, so the URL, browser history and the `doc` computed always agree.
 * @param path - In-Course-Editor path of the node to open; the empty string opens the course settings (root).
 * @returns The `router.push` promise (settles once navigation is done; the leave guard lets same-course
 * navigations pass).
 * Called by: `components/course-editor/CourseEditor.vue#handleUpload`,
 * `components/course-editor/CourseEditor.vue#exitPreview`, `components/course-editor/CourseEditor.vue#template`
 * (`CourseExplorer` `@select`, the "Back to course" button, `CourseFolderDoc` `@open`, `CourseResourceDoc`
 * `@renamed` and `@deleted`, `CourseFileDoc` `@deleted`)
 */
function openPath(path: string) {
  // Always push the editing route record (never the preview one), keeping the course params and encoding the
  // path as route segments.
  return router.push({
    name: courseEditorRouteName,
    params: { ...courseRouteParams(), [inCourseEditorPathParam]: pathToSegments(path) }
  })
}

// Uploading: the modal picks the files and the target folder (proposed from the open node); the first created
// node is opened afterwards.
/**
 * The folder proposed as upload target from the open node: a folder itself, the parent folder of an open file or
 * resource, or the course root when nothing suitable is open or the upload policy refuses the proposal (embedded
 * project directory, `assets/` itself, a package directory).
 * @returns A normalized directory path; the empty string is the course root.
 * Called by: `components/course-editor/CourseEditor.vue#handleUpload` (default value of its `dir` parameter)
 */
function proposedUploadDir() {
  const current = doc.value
  let dir = ''
  // Only tree nodes yield a directory: a folder is used as is, other nodes contribute their parent folder.
  if (current.type === 'node') dir = current.node.type === 'folder' ? current.node.path : dirname(current.node.path)
  // Fall back to the root when the upload policy refuses the proposal (see `upload.ts#validateUploadDir`).
  return validateUploadDir(props.project, dir) == null ? dir : ''
}

/**
 * Upload files into the course: the modal picks the files and confirms the target folder, the files are added to
 * the model (as resource packages under `assets/<kind>`, or as plain records elsewhere) and the first created node
 * is opened. Wrapped by `useMessageHandle` so failures show a toast; closing the modal rejects with `Cancelled`,
 * which the wrapper swallows silently.
 * @param dir - Initial target folder shown in the modal; defaults to `proposedUploadDir()`.
 * @returns Promise<void>; side effects: mutates `props.project` (resources / extra files) and navigates to the
 * first uploaded node.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`CourseExplorer` `@upload` calls
 * `handleUpload.fn()`; `CourseFolderDoc` `@upload` calls `handleUpload.fn(dir)`)
 */
const handleUpload = useMessageHandle(
  async (dir: string = proposedUploadDir()) => {
    // Let the author pick files and adjust the folder; resolves with the normalized dir and the native files.
    const { dir: targetDir, files } = await openUploadModal({
      project: props.project,
      tree: tree.value,
      initialDir: dir
    })
    // Put the files into the model; returns one node path per file (package path or record path).
    const paths = addUploadedFiles(props.project, targetDir, files)
    // Show the first new node so the author sees the result right away.
    await openPath(paths[0])
  },
  { en: 'Failed to upload files', zh: '上传文件失败' }
)

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

// Per-node unsaved marks for the explorer: records are compared with the baseline taken at load and after every
// successful save, so a save made while editing still shows what remains unsaved. Generated records keep their
// identity while their source is unchanged, so comparing `File` instances is enough.
/**
 * The exported records as of the load or the last successful save; the reference point for per-node dirty marks.
 * Written by: setup (initial export), `save` (after a successful save). Read by: `changedPaths`.
 */
const filesBaseline = shallowRef<Files>(props.project.exportFiles())
/**
 * Paths whose record differs from the baseline (added, removed or replaced by another `File` instance).
 * @returns A `Set` of in-Course-Editor paths (see `course-tree.ts#getChangedPaths`).
 * Read by: `CourseEditor.vue#template` (`CourseExplorer` `:changed-paths`, which marks nodes with a dot).
 * Called by: Vue (computed; re-evaluated when `filesBaseline` or any exported record changes)
 */
const changedPaths = computed(() => getChangedPaths(filesBaseline.value, props.project.exportFiles()))

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
  // The saved snapshot becomes the baseline for per-node marks (records edited since keep their dot).
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
/**
 * Full path of the editing route the author was on when Preview was clicked, so "Back to editor" returns there;
 * null when the preview was entered by URL or history.
 * Written by: `handlePreview`, `exitPreview` (consumed). Read by: `exitPreview`.
 */
let routeBeforePreview: string | null = null

/**
 * Build a fresh `TutorialProject` loaded from a snapshot of the working copy, for the playground to run.
 * @returns Promise resolving to the loaded snapshot project (its embedded `SpxProject` is disposed by
 * `CoursePlayground` when it unmounts).
 * Called by: `components/course-editor/CourseEditor.vue#handlePreview`,
 * `components/course-editor/CourseEditor.vue#enterPreviewFromRoute`
 */
async function loadPreviewSnapshot() {
  // A new instance, loaded from the exported metadata + files of the author's project.
  const snapshot = new TutorialProject()
  await snapshot.load(await props.project.snapshot())
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
    // Snapshot first: if loading fails the toast reports it and the route is left untouched.
    const snapshot = await loadPreviewSnapshot()
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
  try {
    const snapshot = await loadPreviewSnapshot()
    // The author may have left the preview route while the snapshot loaded; drop it in that case.
    if (!isPreviewRoute.value) return
    previewError.value = null
    preview.value = snapshot
  } catch (error) {
    // Normalize non-Error throwables so the template can always show `.message`.
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Keep the preview state in step with the route: leaving the preview route drops the snapshot and the error;
 * entering it without a snapshot (URL / history) loads one. `immediate` covers landing directly on the preview
 * URL.
 * @param isPreview - New value of `isPreviewRoute`.
 * @returns void; side effects: clears `preview` / `previewError`, or kicks off `enterPreviewFromRoute`.
 * Called by: Vue (watch on `isPreviewRoute`, immediate)
 */
watch(
  isPreviewRoute,
  (isPreview) => {
    // Leaving the preview (Back to editor, history, completion modal): release the snapshot so the playground
    // unmounts and disposes its project.
    if (!isPreview) {
      preview.value = null
      previewError.value = null
      return
    }
    // Entering the preview: `handlePreview` already set the snapshot; otherwise load it from the route.
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
 * The previewed course finished: show the completion modal a learner would see (with the course's feedback), then
 * either stay in the preview ("continue editing") or exit it.
 * @param completion - Completion payload from the playground runner (`feedback` text or null).
 * @returns Promise<void>; side effects: opens a modal, may navigate out of the preview.
 * Called by: `components/course-editor/CourseEditor.vue#template` (`CoursePlayground @course-completed`)
 */
async function handlePreviewCompleted(completion: PlaygroundCourseCompletion) {
  // The modal resolves with the chosen action ('continueEditing' | 'next' | 'exit').
  const action = await openCompletion({
    course: props.course,
    series: props.series,
    feedback: completion.feedback
  })
  // Both "next" and "exit" leave the preview here: there is no next course to open from the editor.
  if (action === 'continueEditing') return
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
  <section class="relative min-h-full w-full flex flex-col bg-grey-300">
    <!-- Saving mask: covers everything (z-50) while `saving`, so nothing is edited or clicked under the upload. -->
    <UILoading
      v-radar="{ name: 'Saving course mask', desc: 'Covers the editor while the course is being saved' }"
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
          name: 'Course preview banner',
          desc: 'Shows that the course is being previewed, with a button to go back to the editor'
        }"
        class="flex items-center gap-3 bg-primary-100 px-4 py-1 text-sm"
      >
        <span class="flex-1">{{
          $t({ en: 'Previewing the course as a learner', zh: '正在以学习者视角预览课程' })
        }}</span>
        <UIButton
          v-radar="{ name: 'Back to editor button', desc: 'Click to stop previewing and return to the course editor' }"
          type="secondary"
          size="small"
          @click="exitPreview"
        >
          {{ $t({ en: 'Back to editor', zh: '返回编辑器' }) }}
        </UIButton>
      </div>
      <!-- Editor navbar (not previewing): three slots of `NavbarWrapper`. -->
      <NavbarWrapper v-else>
        <!-- Left slot: undo/redo of the embedded Project Editor, only while the project document is open. -->
        <template #left>
          <EditorHistoryButtons v-if="doc.type === 'project'" :state="editorState" />
        </template>
        <!-- Center slot: course title, series title, and the "Unsaved" tag driven by `dirty`. -->
        <template #center>
          <div
            v-radar="{
              name: 'Course editor title',
              desc: 'Title of the course being edited, its series and unsaved state'
            }"
            class="flex min-w-0 items-center gap-2"
          >
            <span class="truncate font-semibold">{{ project.title }}</span>
            <span class="truncate text-sm text-grey-700">{{ series.title }}</span>
            <UITag v-if="dirty">{{ $t({ en: 'Unsaved', zh: '未保存' }) }}</UITag>
          </div>
        </template>
        <!-- Right slot: Project Editor mode switch (project document only), then the Preview and Save buttons.
             Preview is disabled while saving; Save is disabled while clean and shows a spinner while saving. -->
        <template #right>
          <EditorModeSwitch v-if="doc.type === 'project'" :state="editorState" />
          <UIButton
            v-radar="{ name: 'Preview course button', desc: 'Click to preview the course as a learner' }"
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
            v-radar="{ name: 'Save course button', desc: 'Click to save the course' }"
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
    <!-- Main area: a column while previewing (the playground fills it), otherwise a padded row of explorer card +
         document card. The project editor host at the end is mounted in both cases. -->
    <main class="flex-[1_1_0] flex" :class="isPreviewRoute ? 'flex-col' : 'gap-xl p-4 pt-2'">
      <!-- Preview pane (`isPreviewRoute`): an error with retry, the playground once the snapshot is ready, or a
           loading placeholder while `enterPreviewFromRoute` runs. -->
      <template v-if="isPreviewRoute">
        <UIError v-if="previewError != null" class="flex-1" :retry="enterPreviewFromRoute">
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
      <template v-else>
        <!-- Editing pane: the explorer card on the left and one document card on the right. The document card is
             skipped for the project document, whose UI is the always-mounted host below. -->
        <!-- Course explorer + one document at a time. Layout is a placeholder for design to iterate on. -->
        <UICard class="min-w-0 flex-[0_0_260px] overflow-hidden">
          <!-- Explorer: `select(path)` navigates via `openPath`; `upload` opens the upload modal with the target
               folder proposed from the open node (`handleUpload.fn()` with no argument). -->
          <CourseExplorer
            :project="project"
            :tree="tree"
            :active-path="activePath"
            :changed-paths="changedPaths"
            @select="openPath"
            @upload="handleUpload.fn()"
          />
        </UICard>
        <!-- Document card: one branch per `CourseDoc` shape, except `project` (see the host below). -->
        <UICard v-if="doc.type !== 'project'" class="min-w-0 flex-[1_1_0] flex flex-col overflow-hidden">
          <!-- Root document: the course settings stored in `index.json`. -->
          <CourseConfigDoc v-if="doc.type === 'root'" :project="project" />
          <!-- Missing: the route names a path the tree has no node for (deleted, renamed or typed by hand);
               offers a way back to the course root. -->
          <UIEmpty v-else-if="doc.type === 'missing'" class="m-auto" size="small">
            {{ $t({ en: `"${doc.path}" does not exist in the course`, zh: `课程中不存在“${doc.path}”` }) }}
            <UIButton type="secondary" size="small" class="mt-2" @click="openPath('')">
              {{ $t({ en: 'Back to course', zh: '回到课程' }) }}
            </UIButton>
          </UIEmpty>
          <!-- Each document is keyed by its path so switching nodes starts the document fresh. -->
          <!-- Folder node: lists its children and offers uploading into that folder (`handleUpload.fn(dir)`). -->
          <CourseFolderDoc
            v-else-if="doc.node.type === 'folder'"
            :key="doc.node.path"
            :project="project"
            :node="doc.node"
            @open="openPath"
            @upload="(dir) => handleUpload.fn(dir)"
          />
          <!-- Resource package (`assets/<kind>/<name>`): preview, rename and delete. Renaming navigates to the
               new package path; deleting navigates to the kind folder. -->
          <CourseResourceDoc
            v-else-if="doc.node.type === 'resource'"
            :key="doc.node.path"
            :project="project"
            :kind="doc.node.kind"
            :name="doc.node.name"
            @renamed="openPath"
            @deleted="openPath"
          />
          <!-- The course program (`main_course.gox`): a text editor bound directly to `project.mainCourse.code`. -->
          <CourseTextDoc
            v-else-if="doc.node.path === mainCourseFilePath"
            :key="doc.node.path"
            :text="project.mainCourse.code"
            language="xgo"
            @update:text="(text) => project.mainCourse.setCode(text)"
          />
          <!-- Any other record (a file the course does not use): view/edit/delete. After deletion the nearest
               ancestor that still exists is opened. -->
          <CourseFileDoc
            v-else
            :key="doc.node.path"
            :project="project"
            :node="doc.node"
            @deleted="openPath(nearestExistingPath(tree, dirname(activePath)))"
          />
        </UICard>
      </template>
      <!-- Always mounted: the author's editor state outlives document switches and the preview. -->
      <!-- The host renders the Project Editor UI only while `active` (editing route + project document open) but
           keeps its `EditorState` alive otherwise; it reports that state through `v-model:editor-state`, and it
           opens `config.inEditorPath` the first time the project is shown without a path in the route. -->
      <component
        :is="projectEditorHost"
        v-model:editor-state="editorState"
        :project="project.project"
        :root-path="config.project.root"
        :initial-path="config.inEditorPath"
        :active="!isPreviewRoute && doc.type === 'project'"
      />
    </main>
  </section>
</template>
