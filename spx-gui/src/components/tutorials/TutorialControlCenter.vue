<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getCourse } from '@/apis/course'
import { useAsyncComputed } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { UIButton, useConfirmDialog } from '@/components/ui'
import { useTutorial } from './tutorial'
import { InterventionLevel, neutralThreshold, backThreshold } from './tutorial-intervention'
import TutorialCourseRow from './TutorialCourseRow.vue'

const emit = defineEmits<{
  /** Ask the host (the navbar dropdown) to close after a navigation. */
  navigated: []
}>()

const tutorial = useTutorial()
const router = useRouter()
const i18n = useI18n()
const confirm = useConfirmDialog()

const series = computed(() => tutorial.currentSeries)
const currentCourseId = computed(() => tutorial.currentCourse?.id ?? null)

// The whole series, in order, so the learner can see where they are and jump between courses.
const courses = useAsyncComputed(async () => {
  const ids = series.value?.courseIDs ?? []
  return Promise.all(ids.map((id) => getCourse(id)))
})

const guidanceTextByLevel: Record<InterventionLevel, LocaleMessage> = {
  [InterventionLevel.Silent]: { en: 'Guidance: off', zh: '引导：关' },
  [InterventionLevel.Nudge]: { en: 'Guidance: low', zh: '引导：低' },
  [InterventionLevel.Guide]: { en: 'Guidance: high', zh: '引导：高' }
}
const guidanceText = computed<LocaleMessage | null>(() => {
  const level = tutorial.currentIntervention?.level
  return level == null ? null : guidanceTextByLevel[level]
})
const neutralCount = computed(() => tutorial.currentIntervention?.neutralCount ?? 0)
const backCount = computed(() => tutorial.currentIntervention?.backCount ?? 0)

function selectCourse(courseId: string) {
  const seriesId = series.value?.id
  if (seriesId == null || courseId === currentCourseId.value) return
  router.push(`/course/${seriesId}/${courseId}/start`)
  emit('navigated')
}

const { fn: handleReturnHome } = useMessageHandle(
  async () => {
    // Back to the page of the series being learned; the tutorials index is only a fallback.
    const seriesId = series.value?.id
    await router.push(seriesId == null ? '/tutorials' : `/course-series/${seriesId}`)
    emit('navigated')
  },
  { en: 'Failed to open the tutorials page', zh: '打开教程页失败' }
)

const { fn: handleExitCourse } = useMessageHandle(() => tutorial.exitCurrentCourse(), {
  en: 'Failed to exit course',
  zh: '退出课程失败'
})

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    await confirm({
      title: i18n.t({ en: 'Restart course', zh: '重新开始课程' }),
      content: i18n.t({
        en: 'The course will start over and your changes to the course project will be discarded. Are you sure to continue?',
        zh: '课程将重新开始，你对课程项目的修改将被丢弃，确定继续吗？'
      })
    })
    await tutorial.restartCurrentCourse()
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)
</script>

<template>
  <div class="flex max-h-[70vh] w-100 flex-col p-2">
    <header class="flex flex-none items-center justify-between py-1 pl-2 pr-1">
      <span class="text-base font-medium text-text">{{ $t({ en: 'Tutorial', zh: '教程' }) }}</span>
      <UIButton
        v-radar="{ name: 'Exit course', desc: 'Click to exit the current course and return to the course list' }"
        type="secondary"
        size="small"
        @click="handleExitCourse"
      >
        {{ $t({ en: 'Exit course', zh: '退出课程' }) }}
      </UIButton>
    </header>

    <div class="mx-2 my-1 h-px flex-none bg-dividing-line-2"></div>

    <ul class="min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto p-1">
      <TutorialCourseRow
        v-for="course in courses ?? []"
        :key="course.id"
        :course="course"
        :current="course.id === currentCourseId"
        @select="selectCourse(course.id)"
        @restart="handleRestartCourse"
      />
    </ul>

    <footer class="flex-none p-2">
      <button
        v-radar="{ name: 'Return to tutorial homepage', desc: 'Click to leave the course and open the tutorials page' }"
        class="h-[34px] w-full cursor-pointer rounded-md border border-dividing-line-2 bg-grey-100 text-base text-text transition-colors hover:bg-grey-200"
        @click="handleReturnHome"
      >
        {{ $t({ en: 'Return to tutorial homepage', zh: '返回教程首页' }) }}
      </button>
      <!-- Debug-visible guidance state: the level in the user's terms, plus how far the counters
           are toward the next escalation. -->
      <div v-if="guidanceText != null" class="mt-2 flex items-center gap-3 text-xs text-hint-2">
        <span>{{ $t(guidanceText) }}</span>
        <span>Neutral {{ neutralCount }}/{{ neutralThreshold }}</span>
        <span>Back {{ backCount }}/{{ backThreshold }}</span>
      </div>
    </footer>
  </div>
</template>
