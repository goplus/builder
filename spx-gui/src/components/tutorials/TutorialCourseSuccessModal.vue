<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { type Tutorial } from './tutorial'
import { type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useI18n } from '@/utils/i18n'
import { UIButton, UIModal } from '@/components/ui'
import MarkdownView from '@/components/copilot/MarkdownView.vue'
import { editorLeaveConfirm } from '@/components/editor/leave-confirm'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import successImg from '@/assets/images/tutorial-success-illustration-v3.svg'

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

// Course titles are commonly prefixed with their position in the series (for example,
// "4. 第一行代码"). The position is navigation metadata, so keep it out of the learner-facing
// completion message while preserving decimal titles such as "1.2 修改步数".
function courseTitleForDisplay(title: string) {
  return title.replace(/^\s*\d+\.\s+/, '')
}

const shownComment = computed(() => {
  if (props.comment != null && props.comment !== '') return props.comment
  const title = courseTitleForDisplay(course.value.title)
  return i18n.t({ zh: `${title}课程已完成`, en: `${title} completed` })
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
    class="w-[444px]! rounded-xl! shadow-[0_4px_12px_rgba(36,41,47,0.08)]"
    :mask-closable="false"
    @update:visible="handleClose"
  >
    <div class="max-h-[calc(100vh-32px)] overflow-y-auto p-6">
      <div class="flex w-full flex-col items-center">
        <div class="aspect-[2/1] w-full overflow-hidden">
          <img :src="successImg" alt="" class="block size-full object-contain" />
        </div>

        <div class="flex w-full flex-col rounded-lg bg-grey-300 px-6 py-8 text-center">
          <p class="text-xl/[1.4] font-medium text-title">{{ $t({ zh: '太棒了!', en: 'Great!' }) }}</p>
          <!-- The evaluation replaces the fallback as soon as it is available. -->
          <MarkdownView
            class="success-comment mt-2 text-center text-base/[1.5]! font-normal text-grey-900"
            :value="shownComment"
          />
        </div>

        <div class="mt-6 w-full flex flex-col gap-3">
          <UIButton
            class="w-full! rounded-lg! text-[15px]/[24px]!"
            type="white"
            size="large"
            @click="handleRetryCourse"
          >
            {{ $t({ zh: '再试一次', en: 'Try again' }) }}
          </UIButton>
          <UIButton
            class="w-full! rounded-lg! text-[15px]/[24px]!"
            type="white"
            size="large"
            @click="handleBackToCourseSeries"
          >
            {{ $t({ zh: '返回系列课程', en: 'Back to series courses' }) }}
          </UIButton>
          <UIButton
            v-if="hasNextCourse"
            class="w-full! rounded-lg! text-[15px]/[24px]!"
            size="large"
            @click="handleStartNextCourse"
          >
            {{ $t({ zh: '学习下一个课程', en: 'Learn next course' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>

<style scoped>
.success-comment :deep(ol) {
  padding-left: 0;
  list-style-position: inside;
}
</style>
