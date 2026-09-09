<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedGeneric } from 'vue-router'
import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { updateCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseEditorPreviewRouteName, courseEditorRouteName } from '@/apps/xbuilder/router'
import { saveFiles } from '@/models/common/cloud'
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
  UIError,
  UILoading,
  UITag,
  useConfirmDialogWithResult,
  useMessage,
  useModal
} from '@/components/ui'
import CourseExplorer from './CourseExplorer.vue'
import CourseInfoPane from './CourseInfoPane.vue'
import CourseProgramEditor from './CourseProgramEditor.vue'
import CourseVideoDoc from './CourseVideoDoc.vue'
import CourseVideosPane from './CourseVideosPane.vue'
import { getProjectEditorHost } from './project'
import { inCourseEditorPathParam, parseCourseDoc, toInCourseEditorPath, type CourseDoc } from './route'

const props = defineProps<{
  course: PlaygroundCourse
  series: CourseSeries
  /** The author's working copy of the Tutorial project; the page owns its lifecycle. */
  project: TutorialProject
}>()

const emit = defineEmits<{
  saved: [course: PlaygroundCourse]
}>()

const { t } = useI18n()
const m = useMessage()
const route = useRoute()
const router = useRouter()
const confirm = useConfirmDialogWithResult()
const openCompletion = useModal(CoursePlaygroundCompletionModal)

const config = computed(() => {
  const config = props.project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})
const projectEditorHost = computed(() => getProjectEditorHost(config.value.project.type))

const editorState = shallowRef<EditorState | null>(null)

// The open document comes from the route, so it survives reloads and works with browser history.
const doc = computed<CourseDoc>(() => parseCourseDoc(route.params[inCourseEditorPathParam]))
const isPreviewRoute = computed(() => route.name === courseEditorPreviewRouteName)

function courseRouteParams() {
  return { courseSeriesIdInput: route.params.courseSeriesIdInput, courseIdInput: route.params.courseIdInput }
}

function openDoc(next: CourseDoc) {
  return router.push({
    name: courseEditorRouteName,
    params: { ...courseRouteParams(), [inCourseEditorPathParam]: toInCourseEditorPath(next) }
  })
}

function openVideo(name: string) {
  return openDoc({ type: 'videos', name })
}

// Track unsaved changes across everything the Tutorial project exports, plus its metadata.
// `revision` tells a save whether edits happened after its snapshot was taken.
const dirty = ref(false)
const revision = ref(0)
watch(
  () => [props.project.exportFiles(), props.project.title, props.project.thumbnail],
  () => {
    dirty.value = true
    revision.value++
  }
)

// Saving blocks the editor (mask + route guards) so nothing changes underneath the upload. The abort
// controller is the safety net for the paths that bypass the guards (programmatic session end, page close):
// a save that outlives its session must never publish its stale snapshot.
let saveController: AbortController | null = null

async function save(signal: AbortSignal) {
  const { metadata, files } = await props.project.snapshot()
  const savedRevision = revision.value
  if (metadata.title.trim() === '') {
    throw new DefaultException({ en: 'Please enter the course title', zh: '请输入课程标题' })
  }
  const { fileCollection } = await saveFiles(files, signal)
  signal.throwIfAborted()
  const saved = await updateCourse(
    props.course.id,
    { title: metadata.title, thumbnail: metadata.thumbnail, content: fileCollection },
    signal
  )
  if (revision.value === savedRevision) dirty.value = false
  emit('saved', saved as PlaygroundCourse)
}

const handleSave = useMessageHandle(
  async () => {
    const controller = new AbortController()
    saveController = controller
    try {
      await m.withLoading(save(controller.signal), t({ en: 'Saving course...', zh: '保存课程中...' }))
    } finally {
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
const previewError = ref<Error | null>(null)
let routeBeforePreview: string | null = null

/** The course as the learner would see it: the saved record with the working copy's metadata. */
const previewCourse = computed<PlaygroundCourse>(() => ({
  ...props.course,
  title: props.project.title,
  thumbnail: props.project.thumbnail
}))

async function loadPreviewSnapshot() {
  const snapshot = new TutorialProject()
  await snapshot.load(await props.project.snapshot())
  return snapshot
}

const handlePreview = useMessageHandle(
  async () => {
    const snapshot = await loadPreviewSnapshot()
    previewError.value = null
    preview.value = snapshot
    routeBeforePreview = route.fullPath
    await router.push({ name: courseEditorPreviewRouteName, params: { ...courseRouteParams(), inEditorPath: [] } })
  },
  { en: 'Failed to start preview', zh: '启动预览失败' }
)

async function enterPreviewFromRoute() {
  try {
    const snapshot = await loadPreviewSnapshot()
    if (!isPreviewRoute.value) return
    previewError.value = null
    preview.value = snapshot
  } catch (error) {
    previewError.value = error instanceof Error ? error : new Error(String(error))
  }
}

watch(
  isPreviewRoute,
  (isPreview) => {
    if (!isPreview) {
      preview.value = null
      previewError.value = null
      return
    }
    if (preview.value == null) void enterPreviewFromRoute()
  },
  { immediate: true }
)

function exitPreview() {
  const target = routeBeforePreview
  routeBeforePreview = null
  if (target != null) return router.push(target)
  return openDoc({ type: 'project', inEditorPath: [] })
}

async function handlePreviewCompleted(completion: PlaygroundCourseCompletion) {
  const action = await openCompletion({
    course: previewCourse.value,
    series: props.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return
  await exitPreview()
}

function handlePreviewFailed(error: Error) {
  previewError.value = error
}

function confirmDiscardingUnsavedChanges() {
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

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) event.preventDefault()
}

function handleSaveShortcut(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  // command/ctrl + s
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    event.preventDefault()
    if (dirty.value && !saving.value) handleSave.fn()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleSaveShortcut)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleSaveShortcut)
  stopLeaveGuard()
  saveController?.abort(new Cancelled('unmounted'))
})
</script>

<template>
  <section class="relative min-h-full w-full flex flex-col bg-grey-300">
    <UILoading
      v-radar="{ name: 'Saving course mask', desc: 'Covers the editor while the course is being saved' }"
      class="z-50"
      cover
      :visible="saving"
    />
    <header class="flex-none">
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
      <NavbarWrapper v-else>
        <template #left>
          <EditorHistoryButtons v-if="doc.type === 'project'" :state="editorState" />
        </template>
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
    <main class="flex-[1_1_0] flex" :class="isPreviewRoute ? 'flex-col' : 'gap-xl p-4 pt-2'">
      <template v-if="isPreviewRoute">
        <UIError v-if="previewError != null" class="flex-1" :retry="enterPreviewFromRoute">
          {{ previewError.message }}
        </UIError>
        <CoursePlayground
          v-else-if="preview != null"
          :project="preview"
          @course-completed="handlePreviewCompleted"
          @failed="handlePreviewFailed"
        />
        <UIDetailedLoading v-else class="flex-1" :percentage="0">
          <span>{{ $t({ en: 'Preparing preview...', zh: '准备预览中...' }) }}</span>
        </UIDetailedLoading>
      </template>
      <template v-else>
        <!-- Course explorer + one document at a time. Layout is a placeholder for design to iterate on. -->
        <UICard class="min-w-0 flex-[0_0_240px] overflow-hidden">
          <CourseExplorer :project="project" :doc="doc" @select="openDoc" />
        </UICard>
        <UICard v-if="doc.type !== 'project'" class="min-w-0 flex-[1_1_0] flex flex-col overflow-hidden">
          <CourseProgramEditor v-if="doc.type === 'program'" :course="project.mainCourse" />
          <CourseInfoPane v-else-if="doc.type === 'info'" :project="project" />
          <CourseVideoDoc
            v-else-if="doc.type === 'videos' && doc.name != null"
            :project="project"
            :name="doc.name"
            @renamed="openVideo"
            @deleted="openDoc({ type: 'videos', name: null })"
          />
          <CourseVideosPane v-else-if="doc.type === 'videos'" :project="project" @open="openVideo" />
        </UICard>
      </template>
      <!-- Always mounted: the author's editor state outlives document switches and the preview. -->
      <component
        :is="projectEditorHost"
        v-model:editor-state="editorState"
        :project="project.project"
        :initial-path="config.inEditorPath"
        :active="!isPreviewRoute && doc.type === 'project'"
      />
    </main>
  </section>
</template>
