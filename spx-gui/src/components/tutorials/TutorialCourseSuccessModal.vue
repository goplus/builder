<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { type Tutorial } from './tutorial'
import { type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useI18n } from '@/utils/i18n'
import { UIButton, UIImg, UIModal } from '@/components/ui'
import MarkdownView from '@/components/copilot/MarkdownView.vue'
import { editorLeaveConfirm } from '@/components/editor/leave-confirm'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import successImg from './success.png'

const props = defineProps<{
  completion: { course: Course; series: CourseSeries }
  /** The copilot's evaluation. `null` while it is still being written (shows a loading placeholder). */
  comment: string | null
  tutorial: Tutorial
}>()

const emit = defineEmits<{
  close: []
}>()

const i18n = useI18n()
const router = useRouter()

const course = computed(() => props.completion.course)
const series = computed(() => props.completion.series)

const shownComment = computed(() => {
  if (props.comment != null && props.comment !== '') return props.comment
  return i18n.t({ zh: `${course.value.title}课程已完成`, en: `${course.value.title} completed` })
})

const { fn: handleRetryCourse } = useMessageHandle(
  async () => {
    emit('close')
    // The course is still the current one (completion does not end it), so restart it directly.
    await props.tutorial.restartCourse(course.value, series.value)
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)

const { fn: handleBackToCourseSeries } = useMessageHandle(
  async () => {
    editorLeaveConfirm.requestSkipOnce()
    emit('close')
    // Match the tutorial control center: navigate to the series page first and let the route
    // transition finish the current tutorial session instead of ending it before navigation.
    await router.push(`/course-series/${series.value.id}`)
  },
  { en: 'Failed to go back to course series', zh: '返回系列课程失败' }
)

const hasNextCourse = computed(() => {
  const index = series.value.courseIDs.indexOf(course.value.id)
  return index !== -1 && index + 1 < series.value.courseIDs.length
})

const { fn: handleStartNextCourse } = useMessageHandle(
  async () => {
    const index = series.value.courseIDs.indexOf(course.value.id)
    if (index === -1 || index + 1 >= series.value.courseIDs.length) {
      throw new DefaultException({ en: 'The course series is complete', zh: '课程系列已结束' })
    }
    const nextCourseId = series.value.courseIDs[index + 1]
    editorLeaveConfirm.requestSkipOnce()
    emit('close')
    // The start page ends the old course only after navigation succeeds, then runs the next
    // course's opening sequence. Ending it here first would strand a failed navigation outside
    // tutorial mode.
    await router.push(`/course/${series.value.id}/${nextCourseId}/start`)
  },
  { en: 'Failed to learn next course', zh: '学习下一个课程失败' }
)

function handleClose() {
  emit('close')
  props.tutorial.endCurrentCourse()
}
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial Course Success Modal',
      desc: 'Modal shown when a tutorial course is successfully completed'
    }"
    :visible="true"
    size="small"
    mask-closable
    @update:visible="handleClose"
  >
    <div class="px-5 pt-6 pb-6">
      <div class="flex flex-col items-center text-center">
        <UIImg :src="successImg" class="h-47.5 w-67.5" />

        <div class="mt-5 text-2xl">{{ $t({ zh: '太棒了!', en: 'Great!' }) }}</div>

        <!-- Show a complete course-title fallback immediately; an asynchronous copilot evaluation
             replaces it when available without delaying the dialog actions. -->
        <div class="mt-[9px] min-h-7 w-full flex items-center justify-center text-center">
          <div class="text-text">
            <MarkdownView class="text-base/[22px]!" :value="shownComment" />
          </div>
        </div>

        <div class="mt-8 w-full flex flex-col gap-3">
          <UIButton type="neutral" size="large" @click="handleRetryCourse">
            {{ $t({ zh: '再试一次', en: 'Try again' }) }}
          </UIButton>
          <UIButton type="neutral" size="large" @click="handleBackToCourseSeries">
            {{ $t({ zh: '返回系列课程', en: 'Back to series courses' }) }}
          </UIButton>
          <UIButton v-if="hasNextCourse" size="large" @click="handleStartNextCourse">
            {{ $t({ zh: '学习下一个课程', en: 'Learn next course' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>
