<script lang="ts">
/**
 * Validate a candidate video URL, returning `null` when it is absent or hosted on a
 * disallowed origin. The `video` query param is attacker-controlled (anyone can craft a link
 * to this page), so arbitrary origins must never be playable under our domain; course prompts
 * go through the same check for defense in depth.
 */
export function resolveAllowedVideoUrl(value: unknown, extraAllowedOrigins: string[] = []): string | null {
  if (typeof value !== 'string' || value === '') return null
  try {
    const url = new URL(value, window.location.origin)
    const allowedOrigins = [window.location.origin, ...extraAllowedOrigins]
    return allowedOrigins.includes(url.origin) ? url.href : null
  } catch {
    return null
  }
}

/**
 * Story video of a course, by descending precedence: the author's `<course-story-video>`
 * section, the `?video=` override, then the globally configured default.
 */
export function resolveStoryVideoUrl(
  coursePrompt: string,
  queryValue: unknown,
  defaultUrl: string | null,
  extraAllowedOrigins: string[] = []
): string | null {
  const candidates = [extractCourseStoryVideo(coursePrompt), queryValue, defaultUrl]
  for (const candidate of candidates) {
    const resolved = resolveAllowedVideoUrl(candidate, extraAllowedOrigins)
    if (resolved != null) return resolved
  }
  return null
}

/**
 * The opening sequence shown before the course starts: story video, then the course author's
 * text guide (see `extractCoursePrelude`). Steps a course does not configure are omitted.
 */
export type OpeningStep = { kind: 'story-video'; src: string } | { kind: 'prelude'; text: string }

export function getOpeningSteps(coursePrompt: string, storyVideoUrl: string | null): OpeningStep[] {
  const steps: OpeningStep[] = []
  if (storyVideoUrl != null) steps.push({ kind: 'story-video', src: storyVideoUrl })
  const prelude = extractCoursePrelude(coursePrompt)
  if (prelude != null) steps.push({ kind: 'prelude', text: prelude })
  return steps
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCourse } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { tutorialStoryVideoUrl, usercontentBaseUrl } from '@/apps/xbuilder/env'
import { useTutorial } from '@/components/tutorials/tutorial'
import TutorialStoryVideoModal, { extractCourseStoryVideo } from '@/components/tutorials/TutorialStoryVideoModal.vue'
import TutorialPreludeModal, { extractCoursePrelude } from '@/components/tutorials/TutorialPreludeModal.vue'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { ActionException, useAction } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const route = useRoute()

function getUsercontentOrigin(): string | null {
  if (usercontentBaseUrl == null || usercontentBaseUrl === '') return null
  try {
    return new URL(usercontentBaseUrl).origin
  } catch {
    return null
  }
}

const allowedVideoOrigins = computed(() => {
  const usercontentOrigin = getUsercontentOrigin()
  return usercontentOrigin != null ? [usercontentOrigin] : []
})

const courseSeriesQuery = useQuery(async () => getCourseSeries(props.courseSeriesIdInput), {
  en: 'Failed to load course series',
  zh: '加载课程系列失败'
})
const courseQuery = useQuery(async () => await getCourse(props.courseIdInput), {
  en: 'Failed to load course',
  zh: '加载课程失败'
})

const allQueryRet = useQuery(
  async (ctx) => {
    const [courseSeries, course] = await Promise.all([
      composeQuery(ctx, courseSeriesQuery, [{ en: 'Loading course series...', zh: '加载课程系列...' }, 1]),
      composeQuery(ctx, courseQuery, [{ en: 'Loading course...', zh: '加载课程...' }, 1])
    ])
    return { courseSeries, course }
  },
  {
    en: 'Failed to load course',
    zh: '加载课程失败'
  }
)

const isStarting = ref(false)
const startError = shallowRef<ActionException | null>(null)

const startCourse = useAction(
  async () => {
    const data = allQueryRet.data.value
    if (data == null) throw new Error('Course data is not loaded')
    await tutorial.startCourse(data.course, data.courseSeries)
  },
  { en: 'Failed to start course', zh: '启动课程失败' }
)

async function handleStart() {
  if (isStarting.value) return
  startError.value = null
  isStarting.value = true
  try {
    await startCourse()
  } catch (e) {
    if (e instanceof ActionException) startError.value = e
    else throw e
  } finally {
    isStarting.value = false
  }
}

const openingSteps = computed<OpeningStep[]>(() => {
  const data = allQueryRet.data.value
  if (data == null) return []
  const storyVideoUrl = resolveStoryVideoUrl(
    data.course.prompt,
    route.query.video,
    tutorialStoryVideoUrl,
    allowedVideoOrigins.value
  )
  return getOpeningSteps(data.course.prompt, storyVideoUrl)
})

const openingStepIndex = ref(0)
const currentOpeningStep = computed(() => openingSteps.value[openingStepIndex.value] ?? null)

function handleOpeningStepContinue() {
  if (openingStepIndex.value + 1 < openingSteps.value.length) {
    openingStepIndex.value++
    return
  }
  handleStart()
}

// Without any opening step configured, start the course right after loading, as before.
watch(
  () => allQueryRet.data.value,
  (data) => {
    if (data == null || openingSteps.value.length > 0) return
    handleStart()
  },
  { immediate: true }
)
</script>

<template>
  <section class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading
      v-if="allQueryRet.isLoading.value || isStarting"
      :percentage="isStarting ? 100 : allQueryRet.progress.value.percentage"
    >
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
    <UIError v-else-if="startError != null" :retry="handleStart">
      {{ $t(startError.userMessage) }}
    </UIError>
    <template v-else-if="currentOpeningStep != null">
      <TutorialStoryVideoModal
        v-if="currentOpeningStep.kind === 'story-video'"
        visible
        :src="currentOpeningStep.src"
        @continue="handleOpeningStepContinue"
      />
      <TutorialPreludeModal
        v-else-if="currentOpeningStep.kind === 'prelude'"
        visible
        :text="currentOpeningStep.text"
        @continue="handleOpeningStepContinue"
      />
    </template>
  </section>
</template>
