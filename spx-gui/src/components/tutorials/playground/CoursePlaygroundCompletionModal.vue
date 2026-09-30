<script lang="ts">
export type CompletionAction = 'continueEditing' | 'next' | 'exit'
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { UIButton, UIImg, UIModal, UIModalClose } from '@/components/ui'
import CourseMarkdown from './CourseMarkdown.vue'

import successImg from './images/success.svg'

const props = defineProps<{
  visible: boolean
  active?: boolean
  signal: AbortSignal
  course: Course
  series: CourseSeries
  feedback: string | null
}>()

const hasNextCourse = computed(() => {
  const courseIndex = props.series.courseIDs.indexOf(props.course.id)
  return courseIndex >= 0 && courseIndex < props.series.courseIDs.length - 1
})

const emit = defineEmits<{
  cancelled: []
  resolved: [action: CompletionAction]
}>()
const dismissed = ref(false)
function resolve(action: CompletionAction) {
  if (dismissed.value) return
  dismissed.value = true
  emit('resolved', action)
}
function dismiss() {
  resolve('continueEditing')
}
onMounted(() => {
  if (props.signal.aborted) dismiss()
  else props.signal.addEventListener('abort', dismiss, { once: true })
})
onUnmounted(() => props.signal.removeEventListener('abort', dismiss))
</script>

<template>
  <UIModal
    :visible="visible && !dismissed"
    :active="active"
    size="small"
    class="w-111! rounded-xl!"
    :mask-closable="false"
    :radar="{ name: 'course-completion', desc: 'Course completion and next Course actions' }"
    @update:visible="dismiss"
  >
    <div class="max-h-[calc(100vh-32px)] overflow-y-auto p-6">
      <div class="flex justify-end">
        <UIModalClose @click="dismiss" />
      </div>

      <div class="flex flex-col items-center text-center">
        <UIImg :src="successImg" class="aspect-[2/1] w-full object-contain" />
        <div class="w-full rounded-lg bg-grey-300 px-6 py-8">
          <div class="text-xl font-medium text-title">{{ $t({ en: 'Great!', zh: '太棒了！' }) }}</div>
          <CourseMarkdown
            class="mt-2 text-center"
            :value="
              feedback != null && feedback !== ''
                ? feedback
                : $t({ en: `${course.title} course completed`, zh: `${course.title}课程已完成` })
            "
          />
        </div>

        <div class="mt-6 w-full flex flex-col gap-3">
          <UIButton
            v-radar="{ name: 'course-exit', desc: 'Return to the Course Series' }"
            type="neutral"
            size="large"
            class="w-full! rounded-lg!"
            @click="resolve('exit')"
          >
            {{ $t({ en: 'Back to course series', zh: '返回课程系列' }) }}
          </UIButton>
          <UIButton
            v-if="hasNextCourse"
            v-radar="{ name: 'course-next', desc: 'Start the next Course' }"
            size="large"
            class="w-full! rounded-lg!"
            @click="resolve('next')"
          >
            {{ $t({ en: 'Learn next course', zh: '学习下一个课程' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>
