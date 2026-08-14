<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { type Tutorial } from './tutorial'
import { type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useI18n } from '@/utils/i18n'
import { timeout } from '@/utils/utils'
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

// The dialog appears at once; the buttons wait until the comment arrives (or a timeout), so the
// user reads the copilot's evaluation before choosing what to do next.
const commentTimedOut = ref(false)
timeout(8000).then(() => (commentTimedOut.value = true))
const commentReady = computed(() => props.comment != null || commentTimedOut.value)
const shownComment = computed(() => {
  if (props.comment != null && props.comment !== '') return props.comment
  if (commentTimedOut.value) return i18n.t({ zh: '做得好！', en: 'Well done!' })
  return null
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
    props.tutorial.endCurrentCourse()
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
    props.tutorial.endCurrentCourse()
    // Go through the next course's opening sequence (story video, prelude) like any other entry.
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

        <!-- The copilot's evaluation sits where the plain "course completed" line used to be. While
             it is still being written, a typing placeholder holds the space. It renders as Markdown
             through the copilot's own view, so an evaluation naming `repeat` reads the same here as
             it does in the chat — and left-aligned, because centering a code block looks broken. -->
        <div class="mt-3 min-h-12 w-full">
          <div v-if="shownComment != null" class="rounded-md bg-grey-300 px-4 py-3 text-left text-text">
            <MarkdownView :value="shownComment" />
          </div>
          <div v-else class="flex items-center justify-center gap-1.5 rounded-md bg-grey-200 px-4 py-5">
            <span class="typing-dot" />
            <span class="typing-dot" />
            <span class="typing-dot" />
          </div>
        </div>

        <!-- Buttons appear only once the comment is ready, so the user reads it first. -->
        <div v-if="commentReady" class="mt-8 w-full flex flex-col gap-3">
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

<style scoped>
.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--ui-color-grey-600);
  animation: typing-bounce 1.2s ease-in-out infinite;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>
