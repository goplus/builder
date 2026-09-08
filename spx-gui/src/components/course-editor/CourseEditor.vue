<script lang="ts">
type CoursePane = 'program' | 'videos' | 'info'
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { updateCourse, type PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { saveFiles } from '@/models/common/cloud'
import { TutorialProject } from '@/models/tutorial/project'
import type { EditorState } from '@/components/editor/editor-state'
import EditorHistoryButtons from '@/components/editor/navbar/EditorHistoryButtons.vue'
import EditorModeSwitch from '@/components/editor/navbar/EditorModeSwitch.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/runner'
import { UIButton, UICard, UIError, UITab, UITabs, UITag, useConfirmDialogWithResult, useModal } from '@/components/ui'
import CourseInfoPane from './CourseInfoPane.vue'
import CourseProgramEditor from './CourseProgramEditor.vue'
import CourseVideosPane from './CourseVideosPane.vue'
import { getProjectEditorHost } from './project'

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
const confirm = useConfirmDialogWithResult()
const openCompletion = useModal(CoursePlaygroundCompletionModal)

const config = computed(() => {
  const config = props.project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})
const projectEditorHost = computed(() => getProjectEditorHost(config.value.project.type))

const editorState = shallowRef<EditorState | null>(null)
const activePane = ref<CoursePane>('program')

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

const handleSave = useMessageHandle(
  async () => {
    const { metadata, files } = await props.project.snapshot()
    const savedRevision = revision.value
    if (metadata.title.trim() === '') {
      throw new DefaultException({ en: 'Please enter the course title', zh: '请输入课程标题' })
    }
    const { fileCollection } = await saveFiles(files)
    const saved = await updateCourse(props.course.id, {
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      content: fileCollection
    })
    // Edits made while saving are not part of what was uploaded, so they stay unsaved.
    if (revision.value === savedRevision) dirty.value = false
    emit('saved', saved as PlaygroundCourse)
  },
  { en: 'Failed to save course', zh: '保存课程失败' },
  { en: 'Course saved', zh: '课程已保存' }
)

// Preview runs the real Tutorial lifecycle on a snapshot of the author's current work, so learner-side
// edits and course execution never touch the working copy. While previewing, the author's editor UI is
// hidden and detached from the route (its state survives), since both would otherwise drive `inEditorPath`.
const preview = shallowRef<TutorialProject | null>(null)
const previewError = ref<Error | null>(null)

/** The course as the learner would see it: the saved record with the working copy's metadata. */
const previewCourse = computed<PlaygroundCourse>(() => ({
  ...props.course,
  title: props.project.title,
  thumbnail: props.project.thumbnail
}))

const handlePreview = useMessageHandle(
  async () => {
    const snapshot = new TutorialProject()
    await snapshot.load(await props.project.snapshot())
    previewError.value = null
    preview.value = snapshot
  },
  { en: 'Failed to start preview', zh: '启动预览失败' }
)

function exitPreview() {
  preview.value = null
  previewError.value = null
}

async function handlePreviewCompleted(completion: PlaygroundCourseCompletion) {
  const action = await openCompletion({
    course: previewCourse.value,
    series: props.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return
  exitPreview()
}

function handlePreviewFailed(error: Error) {
  previewError.value = error
}

function confirmDiscardingUnsavedChanges() {
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

onBeforeRouteLeave(() => confirmDiscardingUnsavedChanges())

// The same route also serves other courses; only a change of course identity leaves this editing session.
// In-editor navigation (`inEditorPath`) updates the route too and must not prompt.
onBeforeRouteUpdate((to, from) => {
  const sameCourse =
    to.params.courseIdInput === from.params.courseIdInput &&
    to.params.courseSeriesIdInput === from.params.courseSeriesIdInput
  if (sameCourse) return true
  return confirmDiscardingUnsavedChanges()
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) event.preventDefault()
}

function handleSaveShortcut(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  // command/ctrl + s
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    event.preventDefault()
    if (dirty.value && !handleSave.isLoading.value) handleSave.fn()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleSaveShortcut)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleSaveShortcut)
})
</script>

<template>
  <section class="min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <div
        v-if="preview != null"
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
          <EditorHistoryButtons :state="editorState" />
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
          <EditorModeSwitch :state="editorState" />
          <UIButton
            v-radar="{ name: 'Preview course button', desc: 'Click to preview the course as a learner' }"
            class="mr-2"
            type="secondary"
            size="small"
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
            :loading="handleSave.isLoading.value"
            @click="handleSave.fn"
          >
            {{ $t({ en: 'Save', zh: '保存' }) }}
          </UIButton>
        </template>
      </NavbarWrapper>
    </header>
    <main class="flex-[1_1_0] flex" :class="preview != null ? 'flex-col' : 'gap-xl p-4 pt-2'">
      <template v-if="preview != null">
        <UIError v-if="previewError != null" class="flex-1" :retry="handlePreview.fn">
          {{ previewError.message }}
        </UIError>
        <CoursePlayground
          v-else
          :project="preview"
          @course-completed="handlePreviewCompleted"
          @failed="handlePreviewFailed"
        />
      </template>
      <!-- Course-level panes. Layout is a placeholder for design to iterate on. -->
      <UICard v-else class="min-w-0 flex-[0_0_360px] flex flex-col overflow-hidden">
        <UITabs
          v-radar="{ name: 'Course panes tabs', desc: 'Switch between the course program, videos and course info' }"
          class="flex-none border-b border-line py-2"
          :value="activePane"
          @update:value="(v) => (activePane = v as CoursePane)"
        >
          <UITab v-radar="{ name: 'Course program tab', desc: 'Click to edit the course program' }" value="program">
            {{ $t({ en: 'Program', zh: '课程程序' }) }}
          </UITab>
          <UITab v-radar="{ name: 'Videos tab', desc: 'Click to manage course videos' }" value="videos">
            {{ $t({ en: 'Videos', zh: '视频' }) }}
          </UITab>
          <UITab
            v-radar="{ name: 'Course info tab', desc: 'Click to edit course title, thumbnail and Copilot context' }"
            value="info"
          >
            {{ $t({ en: 'Info', zh: '课程信息' }) }}
          </UITab>
        </UITabs>
        <div class="min-h-0 flex-[1_1_0]">
          <CourseProgramEditor v-if="activePane === 'program'" :course="project.mainCourse" />
          <CourseVideosPane v-else-if="activePane === 'videos'" :project="project" />
          <CourseInfoPane v-else :project="project" />
        </div>
      </UICard>
      <!-- Always mounted: the author's editor state must outlive the preview. -->
      <component
        :is="projectEditorHost"
        v-model:editor-state="editorState"
        :project="project.project"
        :initial-path="config.inEditorPath"
        :active="preview == null"
      />
    </main>
  </section>
</template>
