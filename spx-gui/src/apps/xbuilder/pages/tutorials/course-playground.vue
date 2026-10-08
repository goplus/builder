<script setup lang="ts">
import { useRouter } from 'vue-router'

import { getCourseSeries } from '@/apis/course-series'
import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'
import { useMessageHandle } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'
import { repeatableParamToPathSegments } from '@/utils/route'
import { TutorialProject } from '@/models/tutorial/project'
import { useSeriesCourses } from '@/stores/course-series'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal, {
  type CompletionAction
} from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/program'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError, useModal } from '@/components/ui'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
  inEditorPath: string | string[]
}>()

const tutorial = useTutorial()
const router = useRouter()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const seriesCoursesQueryRet = useSeriesCourses(() => props.courseSeriesIdInput)

const sessionQueryRet = useQuery(
  async (ctx) => {
    const courseSeriesID = props.courseSeriesIdInput
    const courseID = props.courseIdInput
    const [series, courses] = await Promise.all([
      getCourseSeries(courseSeriesID, ctx.signal),
      composeQuery(ctx, seriesCoursesQueryRet)
    ])
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
    ctx.signal.addEventListener('abort', () => tutorial.notifyPlaygroundCourseEnded(course.id), {
      once: true
    })
    tutorial.notifyPlaygroundCourseStarted(course, series)

    return { course, series, project }
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearDataOnFetch: true }
)

const session = sessionQueryRet.data

const { fn: handleCompleted } = useMessageHandle(
  async (completion: PlaygroundCourseCompletion) => {
    const completedSession = session.value
    if (completedSession == null) return
    tutorial.notifyPlaygroundCourseCompleted(completedSession.course.id)

    const action: CompletionAction = await openCompletion(
      { course: completedSession.course, series: completedSession.series, feedback: completion.feedback },
      { signal: completedSession.project.getSignal() }
    )
    if (completedSession.project.isDisposed || action === 'continueEditing') return

    if (action === 'retry') {
      await tutorial.startCourse(completedSession.series.id, completedSession.course.id)
      return
    }

    const courseIndex = completedSession.series.courseIDs.indexOf(completedSession.course.id)
    const nextCourseID = completedSession.series.courseIDs[courseIndex + 1] ?? null
    if (action === 'next' && nextCourseID != null) {
      await tutorial.startCourse(completedSession.series.id, nextCourseID)
    } else {
      await router.push(getCourseSeriesPageRoute(completedSession.series.id))
    }
  },
  { en: 'Failed to handle course completion', zh: '处理课程完成失败' }
)
</script>

<template>
  <CoursePlayground
    v-if="session != null"
    :key="session.course.id"
    :project="session.project"
    :in-editor-path="inEditorPath"
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
