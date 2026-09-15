<script setup lang="ts">
import { nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { createDefaultProject } from '@/components/project/default-project'
import { fromConfig, fromText, prefixFiles, type File, type Files } from '@/models/common/file'
import { TutorialProject } from '@/models/tutorial/project'
import { useQuery } from '@/utils/query'
import CoursePlayground from '@/components/tutorials/playground/CoursePlayground.vue'
import CoursePlaygroundCompletionModal, {
  type CompletionAction
} from '@/components/tutorials/playground/CoursePlaygroundCompletionModal.vue'
import type { PlaygroundCourseCompletion } from '@/components/tutorials/playground/runner'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError, useModal } from '@/components/ui'

defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const router = useRouter()
const openCompletion = useModal(CoursePlaygroundCompletionModal)
const runtimeError = ref<Error | null>(null)

type PlaygroundSession = {
  course: PlaygroundCourse
  series: CourseSeries
  project: TutorialProject
}

const session = shallowRef<PlaygroundSession | null>(null)

type MockSession = Pick<PlaygroundSession, 'course' | 'series'>

let mockSession: Promise<MockSession> | null = null

function getMockSession() {
  if (mockSession == null) mockSession = createMockSession()
  return mockSession
}

async function createMockSession(): Promise<MockSession> {
  const project = await createDefaultProject('', '', [])
  const files: Files = {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '/stage/code',
      copilotContext: 'Help the learner explore the Playground Course.'
    }),
    'main_course.gox': fromText(
      'main_course.gox',
      `onStart => {
	showMessage "Welcome to the Playground Course mock."
	completeWith "You have completed the Playground Course mock."
}`
    ),
    ...prefixFiles(project.exportFiles(), 'project')
  }
  project.dispose()

  const course: PlaygroundCourse = {
    id: 'playground-demo-course',
    owner: 'tutorial-demo',
    kind: 'playground',
    title: 'Playground Demo',
    thumbnail: '',
    content: await toFileCollection(files)
  }
  const series: CourseSeries = {
    id: 'playground-demo-series',
    owner: 'tutorial-demo',
    kind: 'playground',
    title: 'Playground Demo Series',
    thumbnail: '',
    description: 'A temporary Course playground for Tutorial v2 development.',
    courseIDs: [course.id],
    order: 1,
    createdAt: '2026-08-26T00:00:00Z',
    updatedAt: '2026-08-26T00:00:00Z'
  }
  return { course, series }
}

async function toFileCollection(files: Files) {
  return Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([path, file]) => [path, await toDataUrl(file!)] as const))
  )
}

async function toDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let content = ''
  for (const byte of bytes) content += String.fromCharCode(byte)
  return `data:${file.type};base64,${btoa(content)}`
}

const entryQueryRet = useQuery(
  async () => {
    // TODO: Load the Course and Course Series from Course APIs once the Tutorial v2 backend data is available.
    const { course, series } = await getMockSession()
    if (course.kind !== 'playground') throw new Error(`course ${course.id} is not a Playground Course`)
    if (!series.courseIDs.includes(course.id)) throw new Error(`course ${course.id} is not in series ${series.id}`)

    const project = await TutorialProject.load(course)
    return { course, series, project }
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  }
)

async function disposeSession() {
  session.value = null
  await nextTick()
}

watch(entryQueryRet.data, async (next) => {
  await disposeSession()
  session.value = next
})

async function retryRuntime() {
  runtimeError.value = null
}

async function handleCompleted(completion: PlaygroundCourseCompletion) {
  const completedSession = session.value
  if (completedSession == null) return

  const action: CompletionAction = await openCompletion({
    course: completedSession.course,
    series: completedSession.series,
    feedback: completion.feedback
  })
  if (action === 'continueEditing') return

  const courseIndex = completedSession.series.courseIDs.indexOf(completedSession.course.id)
  const nextCourseID = completedSession.series.courseIDs[courseIndex + 1] ?? null
  await disposeSession()
  if (action === 'next' && nextCourseID != null) {
    await tutorial.startCourse(completedSession.series.id, nextCourseID)
  } else {
    await router.push(`/course-series/${encodeURIComponent(completedSession.series.id)}`)
  }
}

onBeforeRouteLeave(() => {
  return disposeSession()
})

onUnmounted(() => void disposeSession())
</script>

<template>
  <UIError v-if="runtimeError != null" class="h-full" :retry="retryRuntime">
    {{ runtimeError.message }}
  </UIError>
  <CoursePlayground
    v-else-if="session != null"
    :key="session.course.id"
    :project="session.project"
    @course-completed="handleCompleted"
    @failed="runtimeError = $event"
  />
  <section v-else class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading v-if="entryQueryRet.isLoading.value" :percentage="entryQueryRet.progress.value.percentage">
      <span>{{ $t({ zh: '加载课程中...', en: 'Loading course...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="entryQueryRet.error.value != null" :retry="entryQueryRet.refetch">
      {{ $t(entryQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>
