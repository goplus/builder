<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { getCourseSeries } from '@/apis/course-series'
import { Cancelled, useMessageHandle } from '@/utils/exception'
import { untilLoaded, useQuery, type QueryRet } from '@/utils/query'
import { path2PathSegments, useScopedRouterWithPathParam } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { TutorialProject } from '@/models/tutorial/project'
import { useSeriesCourses } from '@/stores/course-series'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal, {
  type CompletionAction
} from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/program'
import { useTutorial } from '@/components/tutorials/tutorial'
import { getCourseSeriesPageRouteOfCourse } from '@/components/tutorials/units'
import { useModal } from '@/components/ui'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
  inPlaygroundPath: string | string[]
}>()

const tutorial = useTutorial()
const router = useRouter()
const signIn = useSignIn()
const signedInStateQuery = useSignedInStateQuery()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const seriesCoursesQueryRet = useSeriesCourses(() => props.courseSeriesIdInput)
const inPlaygroundRouter = useScopedRouterWithPathParam('inPlaygroundPath', () => props.inPlaygroundPath)

const sessionQueryRet = useQuery(
  async (ctx) => {
    const courseSeriesID = props.courseSeriesIdInput
    const courseID = props.courseIdInput
    ctx.reporter.startAutoReport(1000, { signal: ctx.signal })
    const [signedInState, series, courses] = await Promise.all([
      // Use untilLoaded instead of composeQuery to avoid resetting the session on token refresh.
      // See https://github.com/goplus/builder/issues/3590
      untilLoaded(signedInStateQuery, ctx.signal),
      getCourseSeries(courseSeriesID, ctx.signal),
      // Only route inputs restart preparation; list loading must not become a query dependency.
      untilLoaded(seriesCoursesQueryRet, ctx.signal)
    ])
    ctx.signal.throwIfAborted()
    if (!signedInState.isSignedIn) {
      await signIn()
      throw new Cancelled('redirected to sign in')
    }
    const course = courses.find(({ id }) => id === courseID)
    if (course == null) throw new Error(`course ${courseID} not found in series ${series.id}`)
    if (course.kind !== 'playground') throw new Error(`course ${course.id} is not a Playground Course`)

    const project = await TutorialProject.load(course)
    project.disposeOnSignal(ctx.signal)
    ctx.signal.throwIfAborted()
    if (inPlaygroundRouter.currentPath.value.length === 0) {
      const inEditorPath = path2PathSegments(project.config?.inEditorPath ?? '')
      if (inEditorPath.length > 0) await inPlaygroundRouter.push(inEditorPath, { replace: true })
    }

    ctx.signal.throwIfAborted()
    ctx.signal.addEventListener('abort', () => tutorial.notifyPlaygroundCourseEnded(course.id), {
      once: true
    })
    tutorial.notifyPlaygroundCourseStarted(course, series)

    ctx.reporter.report(1)
    return { course, series, project }
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearResultOnFetch: true }
)

const session = sessionQueryRet.data
usePageTitle(() => {
  const title = session.value?.course.title
  const page = { en: 'Course', zh: '课程' }
  return title == null ? page : [{ en: title, zh: title }, page]
})

const projectQueryRet: QueryRet<TutorialProject> = {
  ...sessionQueryRet,
  data: computed(() => session.value?.project ?? null)
}

const { fn: handleRestart } = useMessageHandle(
  async () => {
    const currentSession = session.value
    if (currentSession == null) return
    await tutorial.startCourse(currentSession.series.id, currentSession.course.id)
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)

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
      await router.push(getCourseSeriesPageRouteOfCourse(completedSession.series, completedSession.course.id))
    }
  },
  { en: 'Failed to handle course completion', zh: '处理课程完成失败' }
)
</script>

<template>
  <CoursePlayground
    :project-query-ret="projectQueryRet"
    :router="inPlaygroundRouter"
    @course-completed="handleCompleted"
    @course-restart="handleRestart"
  />
</template>
