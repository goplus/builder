<script setup lang="ts">
/**
 * Editor for one Playground Course: the course's views, switched from an activity bar, with the embedded project's
 * editor kept mounted throughout, plus saving, unsaved-change tracking, the leave guards and the learner preview.
 */
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedGeneric } from 'vue-router'
import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { getCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseEditorPreviewRouteName, courseEditorRouteName } from '@/apps/xbuilder/router'
import { saveFiles } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import { TutorialProject } from '@/models/tutorial/project'
import { useUpdateCourse } from '@/stores/course'
import { useCopilot } from '@/components/copilot/context'
import type { SessionExported } from '@/components/copilot/copilot'
import type { EditorState } from '@/components/editor/editor-state'
import { History, type Action } from '@/components/editor/history'
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
  course: PlaygroundCourse
  series: CourseSeries
  /** The author's working copy, already loaded. Its owner disposes it, not the editor. */
  project: TutorialProject
}>()

const emit = defineEmits<{
  /** The course as returned by the backend after a successful save. */
  saved: [course: PlaygroundCourse]
}>()

const { t } = useI18n()
const m = useMessage()
const route = useRoute()
const router = useRouter()
const confirm = useConfirmDialogWithResult()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const copilot = useCopilot()
const updateCourse = useUpdateCourse()

const config = computed(() => {
  const config = props.project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})
const projectEditorHost = computed(() => getProjectEditorHost(config.value.project.type))

/** Reported by the project editor host; null until the host has initialized it. */
const editorState = shallowRef<EditorState | null>(null)

// The course's own history. The embedded project keeps its own in `editorState`, so undoing in one never changes
// the other.
const history = new History({
  mutex: props.project.mutex,
  exportFiles: () => props.project.exportOwnFiles(),
  loadFiles: (files) => props.project.loadOwnFiles(files)
})

// Typing in the program is recorded as one step, as long as nothing else is done in between.
const editProgramAction: Action = { name: { en: 'Update program', zh: '修改程序' }, mergeable: true }

// The open view comes from the route, so it survives reloads and works with browser history. The empty path is the
// course itself.
const activePath = computed(() => segmentsToPath(paramToSegments(route.params[inCourseEditorPathParam])))
const resolved = computed(() => resolveView(activePath.value, config.value.project.root))
const open = computed(() => resolved.value.open)
const isPreviewRoute = computed(() => route.name === courseEditorPreviewRouteName)

// Silent while previewing: there the Copilot belongs to the learner's session and must see what a learner's would.
useCourseEditorCopilot(
  () => props.project,
  () => open.value,
  () => isPreviewRoute.value
)

function courseRouteParams() {
  return { courseSeriesIdInput: route.params.courseSeriesIdInput, courseIdInput: route.params.courseIdInput }
}

function openPath(path: string, replace = false) {
  const location = {
    name: courseEditorRouteName,
    params: { ...courseRouteParams(), [inCourseEditorPathParam]: pathToSegments(path) }
  }
  return replace ? router.replace(location) : router.push(location)
}

function openView(view: CourseView) {
  return openPath(getViewPath(view, config.value.project.root))
}

// Keep the URL saying what is on screen: a path inside a view (a single video, as earlier versions addressed one) or
// one no view edits is replaced by the path of the view that shows it. Not on the preview route, whose path belongs
// to the playground.
watch(
  () => (isPreviewRoute.value || resolved.value.path === activePath.value ? null : resolved.value.path),
  (target) => {
    if (target != null) void openPath(target, true)
  },
  { immediate: true }
)

/** Cleared on unmount, so work that outlives the editor (modals, snapshot loads) can drop its result. */
let sessionAlive = true

const dirty = ref(false)
/** Bumped on every edit, so a save can tell whether edits happened after its snapshot was taken. */
const revision = ref(0)
// `exportFiles()` reads every record of the model, so watching it captures all edits. It builds a new map on every
// call; through this computed each edit builds one, shared by the unsaved flag and the per-view marks.
const exportedFiles = computed(() => props.project.exportFiles())
watch(exportedFiles, () => {
  dirty.value = true
  revision.value++
})

// Per-view unsaved marks compare records with the baseline taken at load and after every successful save, so a save
// made while editing still shows what remains unsaved. Generated records keep their identity while their source is
// unchanged, so comparing `File` instances is enough.
const filesBaseline = shallowRef<Files>(exportedFiles.value)
const changedPaths = computed(() => getChangedPaths(filesBaseline.value, exportedFiles.value))
const dirtyViews = computed(() => getDirtyViews(changedPaths.value, config.value.project.root))

// Saving blocks the editor (mask + route guards) so nothing changes underneath the upload. The abort
// controller is the safety net for the paths that bypass the guards (programmatic session end, page close):
// a save that outlives its session must never publish its stale snapshot.
let saveController: AbortController | null = null

async function save(signal: AbortSignal) {
  // Unlike `exportFiles()`, `export()` waits for in-flight transactions of the course and its embedded project.
  const { files } = await props.project.export()
  const savedRevision = revision.value
  const { fileCollection } = await saveFiles(files, signal)
  signal.throwIfAborted()
  // Only the content is written; title and thumbnail belong to course management.
  const saved = (await updateCourse(props.course.id, { content: fileCollection }, signal)) as PlaygroundCourse
  if (revision.value === savedRevision) dirty.value = false
  filesBaseline.value = files
  // Pick up metadata edited elsewhere in the meantime.
  props.project.setMetadata({ title: saved.title, thumbnail: saved.thumbnail })
  emit('saved', saved)
}

const handleSave = useMessageHandle(
  async () => {
    const controller = new AbortController()
    saveController = controller
    try {
      await m.withLoading(save(controller.signal), t({ en: 'Saving course...', zh: '保存课程中...' }))
    } finally {
      // Defensive: the mask prevents overlapping saves.
      if (saveController === controller) saveController = null
    }
  },
  { en: 'Failed to save course', zh: '保存课程失败' },
  { en: 'Course saved', zh: '课程已保存' }
)
const saving = computed(() => handleSave.isLoading.value)

// Preview runs the real Tutorial lifecycle on a snapshot of the author's current work, so learner-side
// edits and course execution never touch the working copy. It lives on its own route (the playground drives
// that route's `inEditorPath`); entering and leaving it, also through browser history, drives the state below.
const preview = shallowRef<TutorialProject | null>(null)
// The editor owns every snapshot it hands the playground, which runs it but does not dispose it: one taken off
// the screen is disposed once the playground has unmounted, and the one on screen when the editor goes, in
// `onUnmounted`.
watch(preview, (_, previous) => {
  if (previous != null) void nextTick(() => previous.dispose())
})
/** Why the preview could not start; errors while it runs are shown by the playground. */
const previewError = ref<Error | null>(null)

// A preview is a walk along the series: it starts at the course being edited and "Learn next course" in the
// completion modal moves it on, the way a learner goes from one course to the next. Only the course being
// edited has a working copy; the ones after it are shown as they were saved.
/** The course the preview is showing or trying to show. A failed load leaves it there, so a retry retries it. */
const previewCourseID = ref(props.course.id)
/** The course the preview is running, assigned once its snapshot has loaded. */
const previewCourse = shallowRef<PlaygroundCourse>(props.course)
/** The editing route to return to; null when the preview was entered by URL or history. */
let routeBeforePreview: string | null = null

/**
 * Starting a preview load takes the next number; leaving the preview bumps it. A load whose number is no longer
 * current when it finishes was superseded (exit, re-enter, unmount) and is discarded.
 */
let previewGeneration = 0

/**
 * Whether work started for preview `generation` still belongs to the preview on screen. What a preview the author
 * has left produces must not reach the one they are in now, even when it is the same course entered again.
 */
function isCurrentPreview(generation: number) {
  return sessionAlive && generation === previewGeneration
}

/**
 * Load a snapshot of the working copy for the playground to run. A failed or superseded load is disposed here; a
 * delivered one once it leaves `preview`.
 * @throws `Cancelled` when the preview moved on while loading.
 */
async function loadPreviewSnapshot(generation: number) {
  const snapshot = new TutorialProject()
  try {
    await snapshot.load(await props.project.export())
  } catch (error) {
    snapshot.dispose()
    throw error
  }
  if (!isCurrentPreview(generation)) {
    snapshot.dispose()
    throw new Cancelled('preview superseded')
  }
  return snapshot
}

const handlePreview = useMessageHandle(
  async () => {
    // Load before navigating: a failure leaves the route alone, and the route watcher finds `preview` set instead of
    // loading a second snapshot. A superseded load rejects with `Cancelled`, which the wrapper swallows.
    const snapshot = await loadPreviewSnapshot(++previewGeneration)
    previewError.value = null
    preview.value = snapshot
    routeBeforePreview = route.fullPath
    await router.push({
      name: courseEditorPreviewRouteName,
      params: { ...courseRouteParams(), inEditorPath: getConfiguredPath(snapshot) }
    })
  },
  { en: 'Failed to start preview', zh: '启动预览失败' }
)

/** Where a learner starting the course lands, as in-editor path segments. */
function getConfiguredPath(snapshot: TutorialProject) {
  return pathToSegments(snapshot.config?.inEditorPath ?? '')
}

/**
 * Point the preview route at `snapshot`'s configured path, without a history entry. The playground opens the
 * project at the route's path and no longer applies the configured one itself.
 * @throws `Cancelled` when the preview moved on during the navigation; the snapshot is disposed on any throw.
 */
async function openPreviewAtConfiguredPath(snapshot: TutorialProject, generation: number) {
  try {
    await router.replace({
      name: courseEditorPreviewRouteName,
      params: { ...courseRouteParams(), inEditorPath: getConfiguredPath(snapshot) },
      query: route.query,
      hash: route.hash
    })
  } catch (error) {
    snapshot.dispose()
    throw error
  }
  if (!isCurrentPreview(generation)) {
    snapshot.dispose()
    throw new Cancelled('preview superseded')
  }
}

/**
 * Start a preview the route asks for without `handlePreview` (typed URL, reload, browser history, or a retry).
 * Errors are shown in place rather than as a toast, since no button triggered this.
 */
async function enterPreviewFromRoute() {
  const generation = ++previewGeneration
  try {
    const snapshot = await loadPreviewSnapshot(generation)
    // No path inside the project (a typed URL, say): start where a learner would.
    if (paramToSegments(route.params.inEditorPath).length === 0) await openPreviewAtConfiguredPath(snapshot, generation)
    previewError.value = null
    preview.value = snapshot
  } catch (error) {
    // A load superseded while it ran, or one that failed after the author had left it, must not replace a preview
    // that is running fine.
    if (error instanceof Cancelled || !isCurrentPreview(generation)) return
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Load a saved course of the series as learners get it: only the course being edited is previewed from unsaved
 * work.
 * @throws `Cancelled` when the preview moved on while loading.
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
  if (!isCurrentPreview(generation)) {
    snapshot.dispose()
    throw new Cancelled('preview superseded')
  }
  return { course, snapshot }
}

/** Walk on to a saved course of the series. Failures are shown in the preview pane, as no button triggered this. */
async function previewSavedCourse(courseID: string) {
  const generation = ++previewGeneration
  previewCourseID.value = courseID
  previewError.value = null
  // Take the finished course off the screen first, so its playground unmounts (and its snapshot is disposed)
  // before another one can be published.
  preview.value = null
  await nextTick()
  try {
    const { course, snapshot } = await loadSavedCourseSnapshot(courseID, generation)
    // The route still says where the finished course was; the next one starts where a learner would.
    await openPreviewAtConfiguredPath(snapshot, generation)
    previewCourse.value = course
    preview.value = snapshot
  } catch (error) {
    // Only the preview on screen shows its errors (see `enterPreviewFromRoute`).
    if (error instanceof Cancelled || !isCurrentPreview(generation)) return
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/** Retry what the preview pane failed to show: the working copy, or the saved course the walk had reached. */
function retryPreview() {
  if (previewCourseID.value === props.course.id) return enterPreviewFromRoute()
  return previewSavedCourse(previewCourseID.value)
}

/** The course after the previewed one, or null at the end of the series or if the course has left it since. */
function nextCourseID(): string | null {
  const ids = props.series.courseIDs
  const index = ids.indexOf(previewCourse.value.id)
  if (index < 0 || index === ids.length - 1) return null
  return ids[index + 1]
}

// The title comes from the snapshot, so the course being edited is named by its unsaved title.
const previewBannerText = computed(() => {
  const title = preview.value?.title
  if (title == null) return { en: 'Previewing the course as a learner', zh: '正在以学习者视角预览课程' }
  return { en: `Previewing "${title}" as a learner`, zh: `正在以学习者视角预览"${title}"` }
})

/**
 * The author's copilot session and panel state, stashed while a preview runs: the playground's runner takes the
 * copilot over with the learner's session (`startSession` ends whatever is current).
 */
let authorCopilot: { session: SessionExported | null; active: boolean } | null = null

function stashAuthorCopilot() {
  if (authorCopilot != null) return
  authorCopilot = { session: copilot.exportCurrentSession(), active: copilot.active }
}

/**
 * Give the author their copilot back. The runner ends its own session on dispose only if it is still current, so
 * restoring first is safe.
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

// `immediate` covers landing directly on the preview URL.
watch(
  isPreviewRoute,
  (isPreview) => {
    if (!isPreview) {
      // Any load still in flight belongs to a preview that is over: let it discard its snapshot.
      previewGeneration++
      preview.value = null
      previewError.value = null
      restoreAuthorCopilot()
      return
    }
    // This runs before the playground mounts and its runner replaces the copilot session.
    stashAuthorCopilot()
    previewCourseID.value = props.course.id
    previewCourse.value = props.course
    // `handlePreview` already set the snapshot; otherwise load it from the route.
    if (preview.value == null) void enterPreviewFromRoute()
  },
  { immediate: true }
)

function exitPreview() {
  // Consume the remembered route so a later, URL-entered preview does not reuse a stale target.
  const target = routeBeforePreview
  routeBeforePreview = null
  if (target != null) return router.push(target)
  return openPath('')
}

async function handlePreviewCompleted(completion: PlaygroundCourseCompletion) {
  // The modal can outlive its preview: the browser's Back button does not close it, so the author may leave the
  // preview, and even enter it again, while it is open. Its answer must then neither walk on nor end the one on screen.
  const generation = previewGeneration
  const action = await openCompletion({
    course: previewCourse.value,
    series: props.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return
  if (!isCurrentPreview(generation)) return
  const next = action === 'next' ? nextCourseID() : null
  if (next != null) return previewSavedCourse(next)
  await exitPreview()
}

function confirmDiscardingUnsavedChanges() {
  // Leaving mid-save could publish a stale snapshot or lose the result.
  if (saving.value) {
    m.warning(t({ en: 'The course is being saved, please wait', zh: '课程正在保存，请稍候' }))
    return false
  }
  if (!dirty.value) return true
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
const stopLeaveGuard = router.beforeEach((to, from) => {
  if (!isThisCourseEditor(from) || isThisCourseEditor(to)) return true
  return confirmDiscardingUnsavedChanges()
})

// Closing or reloading the tab bypasses the router guard.
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) event.preventDefault()
}

function handleSaveShortcut(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    // Suppress the browser's "save page" dialog even when there is nothing to save.
    event.preventDefault()
    if (dirty.value && !saving.value) handleSave.fn()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleSaveShortcut)
})

onUnmounted(() => {
  sessionAlive = false
  // Orphan any preview load in flight. The playground has unmounted by now, so the snapshot on screen can be
  // disposed right away.
  previewGeneration++
  preview.value?.dispose()
  // Leaving the editor from the preview route: the author's copilot must not stay replaced by the learner's.
  restoreAuthorCopilot()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleSaveShortcut)
  stopLeaveGuard()
  // With `Cancelled` as the abort reason, `useMessageHandle` treats the rejection as a cancellation (no error toast).
  saveController?.abort(new Cancelled('unmounted'))
})
</script>

<template>
  <section
    v-radar="{
      name: 'course-editor',
      desc: 'Editor for a Playground Course: its views, the open one and the preview'
    }"
    class="relative min-h-full w-full flex flex-col bg-grey-300"
  >
    <UILoading
      v-radar="{ name: 'saving-mask', desc: 'Covers the editor while the course is being saved' }"
      class="z-50"
      cover
      :visible="saving"
    />
    <header class="flex-none">
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
      <NavbarWrapper v-else>
        <template #left>
          <EditorHistoryButtons :history="open.view === 'project' ? editorState?.history ?? null : history" />
        </template>
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
    <!-- No left padding when editing, so the activity bar meets the window's edge. -->
    <main class="flex-[1_1_0] flex" :class="isPreviewRoute ? 'flex-col' : 'gap-xl p-4 pt-2 pl-0'">
      <CourseActivityBar v-if="!isPreviewRoute" :open="open.view" :dirty-views="dirtyViews" @select="openView" />
      <template v-if="isPreviewRoute">
        <UIError v-if="previewError != null" class="flex-1" :retry="retryPreview">
          {{ previewError.message }}
        </UIError>
        <CoursePlayground
          v-else-if="preview != null"
          :project="preview"
          :in-editor-path="route.params.inEditorPath"
          @course-completed="handlePreviewCompleted"
        />
        <UIDetailedLoading v-else class="flex-1" :percentage="0">
          <span>{{ $t({ en: 'Preparing preview...', zh: '准备预览中...' }) }}</span>
        </UIDetailedLoading>
      </template>
      <UICard v-else-if="open.view !== 'project'" class="min-w-0 flex-[1_1_0] flex flex-col overflow-hidden">
        <CourseConfigDoc v-if="open.view === 'course'" :project="project" :history="history" />
        <!-- Keyed so each page starts fresh. -->
        <CourseResourceGrid
          v-else-if="open.view === 'videos' || open.view === 'images'"
          :key="open.view"
          :project="project"
          :view="open.view"
          :history="history"
        />
        <CourseTextDoc
          v-else
          :text="project.mainCourse.code"
          language="xgo"
          @update:text="(text) => history.doAction(editProgramAction, () => project.mainCourse.setCode(text))"
        />
      </UICard>
      <!-- Always mounted, so the author's editor state outlives view switches and the preview; the host renders the
           Project Editor UI only while `active`. -->
      <component
        :is="projectEditorHost"
        v-model:editor-state="editorState"
        :project="project.project"
        :root-path="config.project.root"
        :initial-path="config.inEditorPath"
        :active="!isPreviewRoute && open.view === 'project'"
      />
    </main>
  </section>
</template>
