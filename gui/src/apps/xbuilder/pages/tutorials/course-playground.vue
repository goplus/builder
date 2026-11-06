<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { Cancelled, useMessageHandle } from '@/utils/exception'
import { composeQuery, untilLoaded, useQuery, QueryMode, type QueryRet } from '@/utils/query'
import { path2PathSegments, useScopedRouterWithPathParam } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { TutorialProject } from '@/models/tutorial/project'
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useSignedIn } from '@/stores/user'
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
const signedIn = useSignedIn()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const sessionCourseQueryRet = useCourse(() => props.courseIdInput, { mode: QueryMode.Snapshot })
const sessionSeriesQueryRet = useSeries(() => props.courseSeriesIdInput, { mode: QueryMode.Snapshot })
const courseQueryRet = useCourse(() => props.courseIdInput)
const seriesQueryRet = useSeries(() => props.courseSeriesIdInput)
const inPlaygroundRouter = useScopedRouterWithPathParam('inPlaygroundPath', () => props.inPlaygroundPath)

const sessionQueryRet = useQuery(
  async (ctx) => {
    const courseSeriesID = props.courseSeriesIdInput
    const courseID = props.courseIdInput
    ctx.reporter.startAutoReport(1000, { signal: ctx.signal })
    const [series, course] = await Promise.all([
      composeQuery(ctx, sessionSeriesQueryRet),
      composeQuery(ctx, sessionCourseQueryRet)
    ])
    ctx.signal.throwIfAborted()
    if (!signedIn.isSignedIn) {
      await signedIn.signIn()
      throw new Cancelled('redirected to sign in')
    }
    if (!series.courseIDs.includes(courseID)) {
      throw new Error(`course ${courseID} not found in series ${courseSeriesID}`)
    }
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
    tutorial.notifyPlaygroundCourseStarted(course.id, series.id)

    ctx.reporter.report(1)
    return { courseID: course.id, seriesID: series.id, project }
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearResultOnFetch: true }
)

const session = sessionQueryRet.data
usePageTitle(() => {
  const title = courseQueryRet.data.value?.title
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
    await tutorial.startCourse(currentSession.seriesID, currentSession.courseID)
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)

const { fn: handleCompleted } = useMessageHandle(
  async (completion: PlaygroundCourseCompletion) => {
    const completedSession = session.value
    if (completedSession == null) return
    tutorial.notifyPlaygroundCourseCompleted(completedSession.courseID)

    const signal = completedSession.project.getSignal()
    const [course, series] = await Promise.all([
      untilLoaded(courseQueryRet, signal),
      untilLoaded(seriesQueryRet, signal)
    ])
    const completionProps = {
      get course() {
        return courseQueryRet.data.value ?? course
      },
      get series() {
        return seriesQueryRet.data.value ?? series
      },
      feedback: completion.feedback
    }
    const action: CompletionAction = await openCompletion(completionProps, { signal })
    if (completedSession.project.isDisposed || action === 'continueEditing') return

    if (action === 'retry') {
      await tutorial.startCourse(completedSession.seriesID, completedSession.courseID)
      return
    }

    const currentSeries = completionProps.series
    const courseIndex = currentSeries.courseIDs.indexOf(completedSession.courseID)
    const nextCourseID = courseIndex < 0 ? null : currentSeries.courseIDs[courseIndex + 1] ?? null
    if (action === 'next' && nextCourseID != null) {
      await tutorial.startCourse(currentSeries.id, nextCourseID)
    } else {
      await router.push(getCourseSeriesPageRouteOfCourse(currentSeries, completedSession.courseID))
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
