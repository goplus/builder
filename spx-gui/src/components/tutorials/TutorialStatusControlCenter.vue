<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { listCourses } from '@/apis/course'
import { useMessageHandle } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { repeatableParamToPathSegments } from '@/utils/route'
import { useAsyncComputed } from '@/utils/utils'
import { UIButton } from '@/components/ui'
import { useDropdown } from '@/components/ui/UIDropdown.vue'
import { useTutorialStatus } from './status'
import { useTutorial } from './tutorial'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'

const router = useRouter()
const tutorialStatus = useTutorialStatus()
const tutorial = useTutorial()
const dropdown = useDropdown()
const currentCourse = computed(() => tutorialStatus.currentCourse)

const courses = useAsyncComputed(async (onCleanup) => {
  const current = currentCourse.value
  if (current == null) return []
  if (current.seriesCourses != null) return current.seriesCourses

  const result = await listCourses(
    {
      courseSeriesID: current.seriesID,
      pageIndex: 1,
      pageSize: current.courseCount,
      orderBy: 'sequenceInCourseSeries'
    },
    getCleanupSignal(onCleanup)
  )
  const coursesByID = new Map(result.data.map((course) => [course.id, course]))
  const loadedCourses = []
  for (const id of current.seriesCourseIDs) {
    const course = coursesByID.get(id)
    if (course != null) {
      loadedCourses.push({ id: course.id, title: course.title, thumbnail: course.thumbnail })
    } else if (id === current.courseID) {
      loadedCourses.push({ id, title: current.courseTitle, thumbnail: '' })
    }
  }
  return loadedCourses
})

const { fn: handleExitCourse } = useMessageHandle(
  () => {
    dropdown?.setVisible(false)
    return tutorial.endCurrentCourse()
  },
  { en: 'Failed to exit course', zh: '退出课程失败' }
)

const { fn: handleReturnSeries } = useMessageHandle(
  async () => {
    const course = currentCourse.value
    if (course == null) return
    dropdown?.setVisible(false)
    await tutorial.endCurrentCourse()
    const seriesRoute = `/course-series/${encodeURIComponent(course.seriesID)}`
    if (router.currentRoute.value.path !== seriesRoute) await router.push(seriesRoute)
  },
  { en: 'Failed to open the course series', zh: '打开系列课程失败' }
)

const { fn: handleSelectCourse } = useMessageHandle(
  async (courseID: string) => {
    const course = currentCourse.value
    if (course == null || courseID === course.courseID) return
    dropdown?.setVisible(false)

    if (course.courseKind === 'playground' && course.seriesCourses != null) {
      const inEditorPath = router.currentRoute.value.params.inEditorPath
      const pathSegments = inEditorPath == null ? [] : repeatableParamToPathSegments(inEditorPath)
      const editorPath = pathSegments.map(encodeURIComponent).join('/')
      await router.push(
        `/course/${encodeURIComponent(course.seriesID)}/${encodeURIComponent(courseID)}/playground/${editorPath}`
      )
      return
    }

    await tutorial.startCourse(course.seriesID, courseID)
  },
  { en: 'Failed to open course', zh: '打开课程失败' }
)

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    const course = currentCourse.value
    if (course == null) return
    dropdown?.setVisible(false)

    if (course.courseKind === 'playground' && course.seriesCourses != null) {
      router.go(0)
      return
    }

    await tutorial.startCourse(course.seriesID, course.courseID)
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
      <TutorialStatusCourseRow
        v-for="(course, index) in courses ?? []"
        :key="course.id"
        :course="course"
        :sequence="index + 1"
        :current="course.id === currentCourse?.courseID"
        :state="course.id === currentCourse?.courseID ? currentCourse.state : null"
        @select="handleSelectCourse(course.id)"
        @restart="handleRestartCourse"
      />
    </ul>

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
