<script lang="ts" setup>
/**
 * Import a course series file, into a series or as a new one, showing each step as it goes: the file is read and
 * checked, what it would change is confirmed, and then it is imported. It can be cancelled until the series is switched
 * to the imported courses; what was written by then is undone.
 */
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { Cancelled, capture, DefaultException, Exception } from '@/utils/exception'
import type { CourseSeries } from '@/apis/course-series'
import { useDeleteCourse } from '@/stores/course'
import { useUpdateCourseSeries } from '@/stores/course-series'
import { useSignedInUser } from '@/stores/user'
import { UIButton, UIModal } from '@/components/ui'
import CourseSeriesFileSteps, { type StepStatus } from './CourseSeriesFileSteps.vue'
import {
  CourseSeriesFileProblems,
  CourseSeriesImportNotUndone,
  importCourseSeriesFileContent,
  inspectCourseSeriesFileContent,
  readCourseSeriesFile,
  type CourseSeriesFileContent,
  type CourseSeriesFileImportInspection,
  type CourseSeriesFileProblem,
  type CourseSeriesFileProgress,
  type CourseSeriesFileStep,
  type CourseSeriesImportResult
} from './course-series-file'
import { courseKindNames } from './kind'

const props = defineProps<{
  visible: boolean
  file: File
  /** The series to import into, replacing its courses, or null to import as a new series. */
  courseSeries: CourseSeries | null
  /** The `order` of a new series. */
  newSeriesOrder: number
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [result: CourseSeriesImportResult]
}>()

const i18n = useI18n()
const signedInUser = useSignedInUser()
const updateCourseSeries = useUpdateCourseSeries()
const deleteCourse = useDeleteCourse()

type Phase = 'reading' | 'confirming' | 'importing' | 'done' | 'cancelled' | 'failed'
const phase = ref<Phase>('reading')
const progress = shallowRef<CourseSeriesFileProgress | null>(null)
const inspection = shallowRef<CourseSeriesFileImportInspection | null>(null)
const result = shallowRef<CourseSeriesImportResult | null>(null)
const failure = shallowRef<{ message: LocaleMessage; problems: CourseSeriesFileProblem[] } | null>(null)
const cancelling = ref(false)
const importStarted = ref(false)
let content: CourseSeriesFileContent | null = null
const ctrl = new AbortController()

const running = computed(() => phase.value === 'reading' || phase.value === 'importing')
// Once the series may hold the imported courses, stopping would leave the import part done.
const canCancel = computed(
  () =>
    !cancelling.value &&
    (phase.value === 'reading' ||
      (phase.value === 'importing' && (progress.value?.step === 'upload' || progress.value?.step == null)))
)

const stepLabels: Record<CourseSeriesFileStep, LocaleMessage> = {
  read: { en: 'Read the file', zh: '读取文件' },
  check: { en: 'Check the courses', zh: '检查课程' },
  upload: { en: 'Upload and create the courses', zh: '上传并创建课程' },
  commit: { en: 'Update the course series', zh: '更新课程系列' },
  cleanup: { en: 'Delete the old courses', zh: '删除原有课程' },
  undo: { en: 'Undo what was written', zh: '撤销已写入的内容' },
  download: { en: 'Download', zh: '下载' },
  pack: { en: 'Pack', zh: '打包' }
}

/** The step under way when the import failed or was cancelled, before any undoing. */
const interrupted = ref<CourseSeriesFileStep | null>(null)
/** Whether undoing left something it could not undo. */
const notUndone = ref(false)

const steps = computed(() => {
  const keys: CourseSeriesFileStep[] = ['read', 'check']
  if (importStarted.value) {
    keys.push('upload')
    if (progress.value?.step === 'undo' || (cancelling.value && phase.value === 'importing')) {
      // A commit found not to have taken is undone too, and stays listed as the step that failed.
      if (interrupted.value === 'commit') keys.push('commit')
      keys.push('undo')
    } else {
      keys.push('commit')
      if (props.courseSeries != null && props.courseSeries.courseIDs.length > 0) keys.push('cleanup')
    }
  }
  const current = interrupted.value ?? progress.value?.step ?? 'read'
  const currentIndex = keys.indexOf(current)
  return keys.map((step, index) => ({ step, label: stepLabels[step], status: statusOf(step, index, currentIndex) }))
})

function statusOf(step: CourseSeriesFileStep, index: number, currentIndex: number): StepStatus {
  if (phase.value === 'done' || phase.value === 'confirming') return 'done'
  if (step === 'undo') {
    if (phase.value === 'importing') return 'running'
    return notUndone.value ? 'failed' : 'done'
  }
  if (index < currentIndex) return 'done'
  if (index > currentIndex) return 'pending'
  if (interrupted.value == null) return 'running'
  return cancelling.value ? 'stopped' : 'failed'
}

function handleProgress(p: CourseSeriesFileProgress) {
  if (p.step === 'undo' && interrupted.value == null) interrupted.value = progress.value?.step ?? 'upload'
  progress.value = p
}

function getSignedInUsername() {
  const username = signedInUser.value?.username
  if (username == null) throw new DefaultException({ en: 'Please sign in first', zh: '请先登录' })
  return username
}

function fail(e: unknown) {
  interrupted.value ??= progress.value?.step ?? 'read'
  if (e instanceof CourseSeriesImportNotUndone) notUndone.value = true
  if (e instanceof Cancelled) {
    phase.value = 'cancelled'
    return
  }
  if (e instanceof CourseSeriesFileProblems) {
    failure.value = { message: e.userMessage, problems: e.problems }
  } else if (e instanceof Exception && e.userMessage != null) {
    failure.value = { message: e.userMessage, problems: [] }
  } else {
    capture(e, 'failed to import course series file')
    failure.value = {
      message: { en: 'Failed to import the course series file', zh: '导入课程系列文件失败' },
      problems: []
    }
  }
  phase.value = 'failed'
}

onMounted(async () => {
  try {
    content = await readCourseSeriesFile(props.file, props.courseSeries, {
      signal: ctrl.signal,
      onProgress: handleProgress
    })
    inspection.value = await inspectCourseSeriesFileContent(
      content,
      props.courseSeries,
      getSignedInUsername(),
      ctrl.signal
    )
    phase.value = 'confirming'
  } catch (e) {
    if (e instanceof Cancelled) return // Closed by the author
    fail(e)
  }
})

async function handleImport() {
  if (content == null) return
  importStarted.value = true
  phase.value = 'importing'
  progress.value = null
  const target =
    props.courseSeries == null
      ? { newSeriesOrder: props.newSeriesOrder }
      : { courseSeries: props.courseSeries, writes: { updateCourseSeries, deleteCourse } }
  try {
    result.value = await importCourseSeriesFileContent(content, target, getSignedInUsername(), {
      signal: ctrl.signal,
      onProgress: handleProgress
    })
    phase.value = 'done'
  } catch (e) {
    fail(e)
  }
}

function handleCancel() {
  if (phase.value === 'importing') {
    // The import stops and undoes what it wrote; the dialog stays to tell how that went.
    cancelling.value = true
    ctrl.abort(new Cancelled('import cancelled'))
    return
  }
  ctrl.abort(new Cancelled('import cancelled'))
  emit('cancelled')
}

function handleClose() {
  if (running.value) return
  if (phase.value === 'done' && result.value != null) emit('resolved', result.value)
  else emit('cancelled')
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (running.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (running.value) ctrl.abort(new Cancelled('import dialog closed'))
})

const title = computed(() =>
  props.courseSeries == null
    ? i18n.t({ en: 'Import as a new course series', zh: '导入为新的课程系列' })
    : i18n.t({ en: `Import into "${props.courseSeries.title}"`, zh: `导入到“${props.courseSeries.title}”` })
)

function formatNames(names: string[]): LocaleMessage {
  const shown = names.slice(0, 8).map((name) => `"${name}"`)
  const more = names.length - shown.length
  return {
    en: shown.join(', ') + (more > 0 ? ` and ${more} more` : ''),
    zh: shown.join('、') + (more > 0 ? ` 等 ${names.length} 个` : '')
  }
}

/** What confirming the import would change, sentence by sentence. */
const changes = computed<LocaleMessage[]>(() => {
  const found = inspection.value
  if (found == null || content == null) return []
  const fileTitle = content.manifest.courseSeries.title
  const courseCount = content.manifest.courses.length
  const sentences: LocaleMessage[] = []
  if (props.courseSeries == null) {
    const kind = courseKindNames[found.kind]
    sentences.push({
      en: `A new ${kind.en} course series "${fileTitle}" will be created with ${courseCount} courses.`,
      zh: `将新建${kind.zh}课程系列“${fileTitle}”，其中有 ${courseCount} 门课程。`
    })
  } else {
    sentences.push({
      en: `The courses of "${props.courseSeries.title}" will be replaced with the ${courseCount} courses of the file, and the series will take its title, description and thumbnail.`,
      zh: `“${props.courseSeries.title}”的课程会换成文件里的 ${courseCount} 门课程，系列的标题、描述和缩略图也换成文件里的。`
    })
    if (found.deletedCourses.length > 0) {
      const names = formatNames(found.deletedCourses)
      sentences.push({ en: `Courses to be deleted: ${names.en}.`, zh: `会删除的课程：${names.zh}。` })
    }
  }
  if (found.kind === 'guided' && found.overwrittenProjects.length > 0) {
    const names = formatNames(found.overwrittenProjects)
    sentences.push({
      en: `Projects to be overwritten and published: ${names.en}.`,
      zh: `会覆盖并发布的项目：${names.zh}。`
    })
  }
  if (props.courseSeries != null) sentences.push({ en: 'This cannot be undone.', zh: '此操作不可撤销。' })
  return sentences
})

const summary = computed<LocaleMessage | null>(() => {
  const imported = result.value
  if (imported == null) return null
  const count = imported.courseSeries.courseIDs.length
  return {
    en: `Imported "${imported.courseSeries.title}" with ${count} courses.`,
    zh: `已导入“${imported.courseSeries.title}”，共 ${count} 门课程。`
  }
})
</script>

<template>
  <UIModal
    :radar="{ name: 'course-series-import-modal', desc: 'Dialog showing the import of a course series file' }"
    :visible="visible"
    :mask-closable="false"
    @update:visible="handleClose"
  >
    <div class="flex flex-col">
      <header class="flex h-14 items-center px-6">
        <h2 class="m-0 flex-1 truncate text-xl font-normal text-title">{{ title }}</h2>
      </header>
      <div class="flex flex-col gap-5 border-t border-dividing-line-2 px-6 py-5">
        <CourseSeriesFileSteps :steps="steps" :progress="progress" />

        <div v-if="phase === 'confirming'" class="flex flex-col gap-2 rounded-md bg-grey-300 p-4 text-grey-900">
          <p v-for="(sentence, i) in changes" :key="i" class="m-0">{{ $t(sentence) }}</p>
        </div>

        <p v-if="phase === 'importing' && cancelling" class="m-0 text-grey-700">
          {{ $t({ en: 'Cancelling, and undoing what was written…', zh: '正在取消，并撤销已写入的内容…' }) }}
        </p>

        <div v-if="phase === 'done'" class="flex flex-col gap-2 rounded-md bg-green-100 p-4 text-grey-900">
          <p class="m-0">{{ summary != null ? $t(summary) : '' }}</p>
          <p v-if="result != null && result.undeletedCourseIDs.length > 0" class="m-0 text-yellow-700">
            {{
              $t({
                en: `${result.undeletedCourseIDs.length} of the old courses could not be deleted (IDs: ${result.undeletedCourseIDs.join(', ')}).`,
                zh: `有 ${result.undeletedCourseIDs.length} 门原有课程没能删除（课程 ID：${result.undeletedCourseIDs.join(', ')}）。`
              })
            }}
          </p>
        </div>

        <p v-if="phase === 'cancelled'" class="m-0 rounded-md bg-grey-300 p-4 text-grey-900">
          {{
            $t({
              en: 'The import was cancelled, and what it wrote was undone.',
              zh: '导入已取消，已写入的内容都已撤销。'
            })
          }}
        </p>

        <div v-if="phase === 'failed' && failure != null" class="flex flex-col gap-2 rounded-md bg-danger-100 p-4">
          <p class="m-0 text-danger-main">
            {{
              failure.problems.length > 0
                ? $t({ en: 'The course series file cannot be imported:', zh: '课程系列文件无法导入：' })
                : $t(failure.message)
            }}
          </p>
          <ul v-if="failure.problems.length > 0" class="m-0 max-h-60 overflow-y-auto pl-5 text-grey-900">
            <li v-for="(problem, i) in failure.problems" :key="i">
              {{ $t({ en: `"${problem.course}": `, zh: `课程“${problem.course}”：` }) }}{{ $t(problem.problem) }}
            </li>
          </ul>
        </div>
      </div>
      <footer class="flex justify-end gap-3 border-t border-dividing-line-2 px-6 py-4">
        <UIButton
          v-if="running || phase === 'confirming'"
          v-radar="{ name: 'cancel-button', desc: 'Click to cancel the import' }"
          type="neutral"
          :disabled="!canCancel && phase !== 'confirming'"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-if="phase === 'confirming'"
          v-radar="{ name: 'import-button', desc: 'Click to import the file' }"
          type="primary"
          @click="handleImport"
        >
          {{ $t({ en: 'Import', zh: '导入' }) }}
        </UIButton>
        <UIButton
          v-if="!running && phase !== 'confirming'"
          v-radar="{ name: 'close-button', desc: 'Click to close the dialog' }"
          type="primary"
          @click="handleClose"
        >
          {{ phase === 'done' ? $t({ en: 'Done', zh: '完成' }) : $t({ en: 'Close', zh: '关闭' }) }}
        </UIButton>
      </footer>
      <p
        v-if="phase === 'importing' && !canCancel && !cancelling && progress?.step !== 'undo'"
        class="m-0 px-6 pb-4 text-right text-sm text-grey-700"
      >
        {{
          $t({
            en: 'Almost done: the import can no longer be cancelled.',
            zh: '即将完成，已无法取消。'
          })
        }}
      </p>
    </div>
  </UIModal>
</template>
