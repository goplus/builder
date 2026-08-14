<!-- Shown when a course's primary goal (the runtime signal) is met but its secondary goal (the way
     the learner was meant to get there) is not. It is deliberately not a failure notice: the run
     did work, and saying so is what makes the remaining ask land as the actual lesson rather than
     as a rejection. -->
<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import type { Tutorial } from './tutorial'
import { UIButton, UIModal } from '@/components/ui'
import MarkdownView from '@/components/copilot/MarkdownView.vue'
import { editorLeaveConfirm } from '@/components/editor/leave-confirm'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import retryIllustration from '@/assets/images/tutorial-retry-illustration.png'

const props = defineProps<{
  visible: boolean
  /** The course-authored line naming what is still missing. Rendered as Markdown, so a hint can
   * name the code it is asking for the way the rest of the app writes code. */
  hint: string
  tutorial: Tutorial
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const hasNextCourse = computed(() => {
  const course = props.tutorial.currentCourse
  const series = props.tutorial.currentSeries
  if (course == null || series == null) return false
  const index = series.courseIDs.indexOf(course.id)
  return index !== -1 && index + 1 < series.courseIDs.length
})

const { fn: handleStartNextCourse } = useMessageHandle(
  async () => {
    const course = props.tutorial.currentCourse
    const series = props.tutorial.currentSeries
    if (course == null || series == null) {
      throw new DefaultException({ en: 'No course in progress', zh: '当前没有正在学习的课程' })
    }
    const index = series.courseIDs.indexOf(course.id)
    if (index === -1 || index + 1 >= series.courseIDs.length) {
      throw new DefaultException({ en: 'The course series is complete', zh: '课程系列已结束' })
    }
    const nextCourseId = series.courseIDs[index + 1]
    editorLeaveConfirm.requestSkipOnce()
    emit('close')
    // `course-start.vue` owns the handoff and ends the old session after this navigation lands.
    await router.push(`/course/${series.id}/${nextCourseId}/start`)
  },
  { en: 'Failed to learn next course', zh: '学习下一个课程失败' }
)
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial course retry modal',
      desc: 'Shown when the course goal was reached but not in the way the course is teaching'
    }"
    :visible="visible"
    size="small"
    class="w-[444px]! rounded-xl! shadow-[0_4px_12px_rgba(36,41,47,0.08)]"
    mask-closable
    @update:visible="emit('close')"
  >
    <div class="flex flex-col items-center gap-6 p-6">
      <div class="flex w-full flex-col">
        <img :src="retryIllustration" alt="" class="block h-[190px] w-[396px]" />
        <div class="flex min-h-[164px] w-full flex-col justify-center rounded-lg bg-grey-300 px-6 py-8">
          <p class="text-base/[22px] font-medium text-grey-900">
            {{ $t({ en: 'Almost there!', zh: '就差一点！' }) }}
          </p>
          <p class="text-base/[22px] font-medium text-grey-900">
            {{ $t({ en: 'Your program reached the goal.', zh: '你的程序已经达成目标了。' }) }}
          </p>
          <MarkdownView v-if="hint !== ''" class="text-base/[22px]! font-medium text-grey-900" :value="hint" />
        </div>
      </div>

      <div class="flex w-full flex-col gap-3">
        <UIButton
          v-if="hasNextCourse"
          class="w-full! rounded-lg! text-[15px]/[24px]!"
          type="secondary"
          size="large"
          @click="handleStartNextCourse"
        >
          {{ $t({ en: 'Learn next course', zh: '学习下一课程' }) }}
        </UIButton>
        <UIButton class="w-full! rounded-lg! text-[15px]/[24px]!" type="primary" size="large" @click="emit('close')">
          {{ $t({ en: 'Try it that way', zh: '再试一次' }) }}
        </UIButton>
      </div>
    </div>
  </UIModal>
</template>
