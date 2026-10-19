<script lang="ts">
/** A step not started, under way, done, failed, or stopped by a cancellation. */
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'stopped'
</script>

<script lang="ts" setup>
/** The steps of an import or export of a course series file, with the progress of the one under way. */
import { computed } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import { humanizeFileSize } from '@/utils/utils'
import { UIIcon } from '@/components/ui'
import type { CourseSeriesFileProgress, CourseSeriesFileStep } from './course-series-file'

const props = defineProps<{
  /** The steps, in order. */
  steps: Array<{ step: CourseSeriesFileStep; label: LocaleMessage; status: StepStatus }>
  /** The latest progress, shown under the step it is of while that step is under way. */
  progress: CourseSeriesFileProgress | null
}>()

/** The part of the step under way that is done, from 0 to 1, or null if it cannot be told. */
const fraction = computed(() => {
  const progress = props.progress
  if (progress == null) return null
  if (progress.bytes?.total != null && progress.bytes.total > 0) return progress.bytes.loaded / progress.bytes.total
  if (progress.total > 0) return progress.done / progress.total
  return null
})

const details = computed(() => {
  const progress = props.progress
  if (progress == null) return null
  const parts: LocaleMessage[] = []
  if (progress.total > 0)
    parts.push({ en: `${progress.done} / ${progress.total}`, zh: `${progress.done} / ${progress.total}` })
  const bytes = progress.bytes
  if (bytes != null) {
    const loaded = humanizeFileSize(bytes.loaded)
    if (bytes.total == null) parts.push(loaded)
    else {
      const total = humanizeFileSize(bytes.total)
      parts.push({ en: `${loaded.en} / ${total.en}`, zh: `${loaded.zh} / ${total.zh}` })
    }
  }
  return parts.length === 0 ? null : parts
})
</script>

<template>
  <ol class="m-0 flex flex-col gap-3 p-0">
    <li v-for="{ step, label, status } in steps" :key="step" class="flex list-none flex-col gap-2">
      <div class="flex items-center gap-2" :class="status === 'pending' ? 'text-grey-600' : 'text-grey-900'">
        <UIIcon v-if="status === 'done'" class="h-4 w-4 text-green-main" type="check" />
        <UIIcon v-else-if="status === 'failed'" class="h-4 w-4 text-danger-main" type="error" />
        <UIIcon v-else-if="status === 'stopped'" class="h-4 w-4 text-grey-700" type="minus" />
        <UIIcon v-else-if="status === 'running'" class="h-4 w-4 animate-spin text-primary-main" type="loading" />
        <span v-else class="h-4 w-4 shrink-0 rounded-full border border-grey-500"></span>
        <span>{{ $t(label) }}</span>
      </div>
      <div v-if="status === 'running' && progress?.step === step" class="ml-6 flex flex-col gap-1">
        <div class="h-1.5 overflow-hidden rounded-full bg-grey-400">
          <div
            v-if="fraction != null"
            class="h-full rounded-full bg-primary-main transition-[width] duration-200"
            :style="{ width: `${Math.round(fraction * 100)}%` }"
          ></div>
          <div v-else class="h-full w-1/3 animate-pulse rounded-full bg-primary-main"></div>
        </div>
        <span v-if="details != null" class="text-sm text-grey-700">
          {{ details.map((part) => $t(part)).join(' · ') }}
        </span>
      </div>
    </li>
  </ol>
</template>
