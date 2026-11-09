<script lang="ts" setup>
/** Export a course series to a file, showing each step as it goes, and save the file once it is ready. */
import saveAs from 'file-saver'
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import { Cancelled, capture, Exception } from '@/utils/exception'
import { humanizeFileSize } from '@/utils/utils'
import type { CourseSeries } from '@/apis/course-series'
import { UIButton, UIModal } from '@/components/ui'
import CourseSeriesFileSteps, { type StepStatus } from './CourseSeriesFileSteps.vue'
import { exportCourseSeriesFile, type CourseSeriesFileProgress, type CourseSeriesFileStep } from './course-series-file'

const props = defineProps<{
  visible: boolean
  courseSeries: CourseSeries
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

type Phase = 'exporting' | 'done' | 'failed'
const phase = ref<Phase>('exporting')
const progress = shallowRef<CourseSeriesFileProgress | null>(null)
const exported = shallowRef<File | null>(null)
const failure = shallowRef<LocaleMessage | null>(null)
const ctrl = new AbortController()

const stepLabels: Array<{ step: CourseSeriesFileStep; label: LocaleMessage }> = [
  { step: 'read', label: { en: 'Read the courses', zh: '读取课程' } },
  { step: 'download', label: { en: 'Download the course files', zh: '下载课程文件' } },
  { step: 'pack', label: { en: 'Pack the file', zh: '打包文件' } }
]

const steps = computed(() => {
  const currentIndex = stepLabels.findIndex(({ step }) => step === (progress.value?.step ?? 'read'))
  return stepLabels.map(({ step, label }, index) => {
    let status: StepStatus
    if (phase.value === 'done' || index < currentIndex) status = 'done'
    else if (index > currentIndex) status = 'pending'
    else status = phase.value === 'failed' ? 'failed' : 'running'
    return { step, label, status }
  })
})

onMounted(async () => {
  try {
    const file = await exportCourseSeriesFile(props.courseSeries, {
      signal: ctrl.signal,
      onProgress: (p) => (progress.value = p)
    })
    exported.value = file
    phase.value = 'done'
    saveAs(file, file.name)
  } catch (e) {
    if (e instanceof Cancelled) return // Cancelled by the author, who closed the dialog
    if (e instanceof Exception && e.userMessage != null) {
      failure.value = e.userMessage
    } else {
      capture(e, 'failed to export course series file')
      failure.value = { en: 'Failed to export the course series file', zh: '导出课程系列文件失败' }
    }
    phase.value = 'failed'
  }
})

onUnmounted(() => ctrl.abort(new Cancelled('export dialog closed')))

function handleCancel() {
  ctrl.abort(new Cancelled('export cancelled'))
  emit('cancelled')
}

function handleClose() {
  if (phase.value === 'exporting') return
  if (phase.value === 'done') emit('resolved')
  else emit('cancelled')
}

const summary = computed<LocaleMessage | null>(() => {
  const file = exported.value
  if (file == null) return null
  const size = humanizeFileSize(file.size)
  return {
    en: `Saved "${file.name}" (${size.en}).`,
    zh: `已保存“${file.name}”（${size.zh}）。`
  }
})
</script>

<template>
  <UIModal
    :radar="{ name: 'course-series-export-modal', desc: 'Dialog showing the export of a course series file' }"
    :visible="visible"
    :mask-closable="false"
    @update:visible="handleClose"
  >
    <div class="flex flex-col">
      <header class="flex h-14 items-center px-6">
        <h2 class="m-0 flex-1 truncate text-xl font-normal text-title">
          {{ $t({ en: `Export "${courseSeries.title}"`, zh: `导出“${courseSeries.title}”` }) }}
        </h2>
      </header>
      <div class="flex flex-col gap-5 border-t border-dividing-line-2 px-6 py-5">
        <CourseSeriesFileSteps :steps="steps" :progress="progress" />
        <p v-if="phase === 'done' && summary != null" class="m-0 rounded-md bg-green-100 p-4 text-grey-900">
          {{ $t(summary) }}
        </p>
        <p v-if="phase === 'failed' && failure != null" class="m-0 rounded-md bg-danger-100 p-4 text-danger-main">
          {{ $t(failure) }}
        </p>
      </div>
      <footer class="flex justify-end gap-3 border-t border-dividing-line-2 px-6 py-4">
        <UIButton
          v-if="phase === 'exporting'"
          v-radar="{ name: 'cancel-button', desc: 'Click to cancel the export' }"
          type="neutral"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-else
          v-radar="{ name: 'close-button', desc: 'Click to close the dialog' }"
          type="primary"
          @click="handleClose"
        >
          {{ phase === 'done' ? $t({ en: 'Done', zh: '完成' }) : $t({ en: 'Close', zh: '关闭' }) }}
        </UIButton>
      </footer>
    </div>
  </UIModal>
</template>
