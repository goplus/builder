<script lang="ts" setup>
import { useRouter } from 'vue-router'

import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'
import { useMessageHandle } from '@/utils/exception'
import { useSeriesCourses } from '@/stores/course-series'
import { UIButton, UILoading } from '@/components/ui'
import { useDropdown } from '@/components/ui/UIDropdown.vue'
import { useTutorial } from './tutorial'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'

const router = useRouter()
const tutorial = useTutorial()
const dropdown = useDropdown()
const coursesQueryRet = useSeriesCourses(() => tutorial.currentCourse?.series.id ?? null)
const courses = coursesQueryRet.data

const { fn: handleExitCourse } = useMessageHandle(
  () => {
    dropdown?.setVisible(false)
    return tutorial.endCurrentCourse()
  },
  { en: 'Failed to exit course', zh: '退出课程失败' }
)

const { fn: handleReturnSeries } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    dropdown?.setVisible(false)
    await tutorial.endCurrentCourse()
    const seriesRoute = getCourseSeriesPageRoute(currentCourse.series.id)
    if (router.currentRoute.value.path !== seriesRoute) await router.push(seriesRoute)
  },
  { en: 'Failed to return to series courses', zh: '返回系列课程失败' }
)

const { fn: handleSelectCourse } = useMessageHandle(
  async (courseID: string) => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null || courseID === currentCourse.id) return
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.series.id, courseID)
  },
  { en: 'Failed to open course', zh: '打开课程失败' }
)

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.series.id, currentCourse.id)
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

    <div class="min-h-0 flex-1 overflow-y-auto p-1">
      <UILoading v-if="coursesQueryRet.isLoading.value" class="h-24" />
      <ul v-else class="flex flex-col gap-2">
        <TutorialStatusCourseRow
          v-for="(course, index) in courses ?? []"
          :key="course.id"
          :course="course"
          :sequence="index + 1"
          :active="course.id === tutorial.currentCourse?.id"
          :state="course.id === tutorial.currentCourse?.id ? tutorial.currentCourse?.state ?? null : null"
          @select="handleSelectCourse(course.id)"
          @restart="handleRestartCourse"
        />
      </ul>
    </div>

    <footer class="flex-none p-2">
      <button
        v-radar="{ name: 'Return to series courses', desc: 'Click to leave the course and open its series page' }"
        type="button"
        class="h-[34px] w-full cursor-pointer rounded-md border border-dividing-line-2 bg-grey-100 text-base text-text transition-colors hover:bg-grey-200"
        @click="handleReturnSeries"
      >
        {{ $t({ en: 'Back to series courses', zh: '返回系列课程' }) }}
      </button>
    </footer>
  </div>
</template>
