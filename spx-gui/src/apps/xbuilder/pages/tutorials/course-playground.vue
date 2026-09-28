<script setup lang="ts">
import { useRouter } from 'vue-router'

import { listCourses } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { useQuery } from '@/utils/query'
import { repeatableParamToPathSegments } from '@/utils/route'
import { TutorialProject } from '@/models/tutorial/project'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal, {
  type CompletionAction
} from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/runner'
import { useTutorial } from '@/components/tutorials/tutorial'
import { useTutorialStatus } from '@/components/tutorials/status'
import { UIDetailedLoading, UIError, useModal } from '@/components/ui'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
  inEditorPath: string | string[]
}>()

const tutorialStatus = useTutorialStatus()
const tutorial = useTutorial()
const router = useRouter()
const openCompletion = useModal(CoursePlaygroundCompletionModal)

const sessionQueryRet = useQuery(
  async (ctx) => {
    const courseSeriesID = props.courseSeriesIdInput
    const courseID = props.courseIdInput
    const [series, coursesPage] = await Promise.all([
      getCourseSeries(courseSeriesID, ctx.signal),
      listCourses(
        {
          courseSeriesID,
          pageIndex: 1,
          pageSize: 100,
          orderBy: 'sequenceInCourseSeries'
        },
        ctx.signal
      )
    ])
    const courses = coursesPage.data
    if (!series.courseIDs.includes(courseID)) throw new Error(`course ${courseID} is not in series ${series.id}`)
    const course = courses.find(({ id }) => id === courseID)
    if (course == null) throw new Error(`course ${courseID} not found in series ${series.id}`)
    if (course.kind !== 'playground') throw new Error(`course ${course.id} is not a Playground Course`)

    const project = await TutorialProject.load(course)
    project.disposeOnSignal(ctx.signal)
    ctx.signal.throwIfAborted()
    if (repeatableParamToPathSegments(props.inEditorPath).length === 0) {
      const inEditorPath = (project.config?.inEditorPath ?? '').split('/').filter((segment) => segment !== '')
      if (inEditorPath.length > 0) {
        const currentRoute = router.currentRoute.value
        await router.replace({
          params: { ...currentRoute.params, inEditorPath },
          query: currentRoute.query,
          hash: currentRoute.hash
        })
      }
    }

    ctx.signal.throwIfAborted()
    ctx.signal.addEventListener('abort', () => tutorialStatus.clearCurrentCourse('playground', course.id), {
      once: true
    })
    tutorialStatus.setCurrentCourse(course, series, courses)

    return { course, courses, series, project }
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearDataOnFetch: true }
)

const session = sessionQueryRet.data

async function handleCompleted(completion: PlaygroundCourseCompletion) {
  const completedSession = session.value
  if (completedSession == null) return
  tutorialStatus.markCurrentCourseCompleted('playground', completedSession.course.id)

  const action: CompletionAction = await openCompletion({
    course: completedSession.course,
    series: completedSession.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return

  const courseIndex = completedSession.series.courseIDs.indexOf(completedSession.course.id)
  const nextCourseID = completedSession.series.courseIDs[courseIndex + 1] ?? null
  if (action === 'next' && nextCourseID != null) {
    await tutorial.startCourse(completedSession.series.id, nextCourseID)
  } else {
    await router.push(`/course-series/${encodeURIComponent(completedSession.series.id)}`)
  }
}
</script>

<template>
  <CoursePlayground
    v-if="session != null"
    :key="session.course.id"
    :project="session.project"
    @course-completed="handleCompleted"
  />
  <section v-else class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading v-if="sessionQueryRet.isLoading.value" :percentage="sessionQueryRet.progress.value.percentage">
      <span>{{ $t({ zh: '加载课程中...', en: 'Loading course...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="sessionQueryRet.error.value != null" :retry="sessionQueryRet.refetch">
      {{ $t(sessionQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>
