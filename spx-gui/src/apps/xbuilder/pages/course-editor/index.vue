<script setup lang="ts">
/**
 * Loads the course and series named by the route and renders `CourseEditor` for them. The page owns the loaded
 * project and disposes it when the course changes or the page unmounts.
 */
import { nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { Cancelled, DefaultException } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { untilNotNull, usePageTitle } from '@/utils/utils'
import { getCourse, type PlaygroundCourse } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import { useSignedInStateQuery } from '@/stores/user'
import { TutorialProject } from '@/models/tutorial/project'
import { UIDetailedLoading, UIError } from '@/components/ui'
import CourseEditor from '@/components/course-editor/CourseEditor.vue'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const signedInStateQuery = useSignedInStateQuery()

type EditingSession = {
  course: PlaygroundCourse
  series: CourseSeries
  project: TutorialProject
}

/** The session on screen, or `null` while loading, after a failure, or while switching courses. */
const session = shallowRef<EditingSession | null>(null)

usePageTitle(() => {
  const current = session.value
  if (current == null) return { en: 'Course editor', zh: '课程编辑器' }
  // Course titles are not localized, so the same string is used for both languages.
  return [
    { en: current.course.title, zh: current.course.title },
    { en: 'Course editor', zh: '课程编辑器' }
  ]
})

const entryQueryRet = useQuery(
  async (ctx) => {
    // Read route params synchronously so that their change re-runs the query.
    const courseIdInput = props.courseIdInput
    const courseSeriesIdInput = props.courseSeriesIdInput
    // Keep the reads below from becoming dependencies, which would re-run the query endlessly.
    await nextTick()

    const signedInState = await untilNotNull(signedInStateQuery.data, ctx.signal)
    if (!signedInState.isSignedIn || signedInState.user?.capabilities.canManageCourses !== true) {
      throw new DefaultException({ en: 'You are not allowed to edit courses', zh: '你没有编辑课程的权限' })
    }

    const [course, series] = await Promise.all([
      getCourse(courseIdInput, ctx.signal),
      getCourseSeries(courseSeriesIdInput, ctx.signal)
    ])
    if (course.kind !== 'playground') {
      throw new DefaultException({
        en: 'Only Playground Courses are edited here; Guided Courses are edited from course management',
        zh: '这里只编辑目标式课程；引导式课程请在课程管理中编辑'
      })
    }
    if (!series.courseIDs.includes(course.id)) {
      throw new DefaultException({
        en: `Course "${course.title}" is not in series "${series.title}"`,
        zh: `课程"${course.title}"不属于系列"${series.title}"`
      })
    }

    // `TutorialProject.load` takes no signal, so check for an abort afterwards. `useQuery` discards a superseded
    // result, so the project must be disposed here.
    const project = await TutorialProject.load(course)
    if (ctx.signal.aborted) {
      project.dispose()
      throw new Cancelled('superseded')
    }
    return { course, series, project }
  },
  {
    en: 'Failed to load course',
    zh: '加载课程失败'
  }
)

async function disposeSession() {
  // Clear synchronously so that a concurrent call cannot dispose the same project twice.
  const current = session.value
  session.value = null
  // Let `CourseEditor` unmount first: the editor state inside it references the project until then.
  await nextTick()
  current?.project.dispose()
}

watch(entryQueryRet.data, async (next) => {
  // End the old session first so that at most one `CourseEditor` is mounted.
  await disposeSession()
  session.value = next
})

// `useQuery` keeps the previous data while re-fetching or after a failure. When the route switches to
// another course, the previous session must not stay on screen: end it as soon as a new load starts or fails.
watch([entryQueryRet.isLoading, entryQueryRet.error], ([isLoading, error]) => {
  if (isLoading || error != null) void disposeSession()
})

onUnmounted(() => void disposeSession())

/** Takes the saved course record so that the metadata on screen matches the backend's. */
function handleSaved(course: PlaygroundCourse) {
  // The save may complete after the session has ended (page left, course switched).
  const current = session.value
  if (current == null) return
  session.value = { ...current, course }
}
</script>

<template>
  <!-- Keyed by course id: switching courses remounts it with fresh state, while `handleSaved` updates it in place. -->
  <CourseEditor
    v-if="session != null"
    :key="session.course.id"
    :course="session.course"
    :series="session.series"
    :project="session.project"
    @saved="handleSaved"
  />
  <section v-else class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading v-if="entryQueryRet.isLoading.value" :percentage="entryQueryRet.progress.value.percentage">
      <span>{{ $t({ zh: '加载课程中...', en: 'Loading course...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="entryQueryRet.error.value != null" :retry="entryQueryRet.refetch">
      {{ $t(entryQueryRet.error.value.userMessage) }}
    </UIError>
    <!-- Briefly empty while a finished load is handed over to the new session. -->
  </section>
</template>
