<script lang="ts">
/**
 * Resolve the story video URL from the `video` query param, falling back to `defaultUrl`.
 * Only URLs on an allowed origin are accepted: the query param is attacker-controlled (anyone
 * can craft a link to this page), so arbitrary origins must not be playable under our domain.
 */
export function resolveStoryVideoUrl(
  queryValue: unknown,
  defaultUrl: string | null,
  extraAllowedOrigins: string[] = []
): string | null {
  if (typeof queryValue !== 'string' || queryValue === '') return defaultUrl
  try {
    const url = new URL(queryValue, window.location.origin)
    const allowedOrigins = [window.location.origin, ...extraAllowedOrigins]
    return allowedOrigins.includes(url.origin) ? url.href : defaultUrl
  } catch {
    return defaultUrl
  }
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCourse } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { tutorialStoryVideoUrl, usercontentBaseUrl } from '@/apps/xbuilder/env'
import { useTutorial } from '@/components/tutorials/tutorial'
import TutorialStoryVideoModal from '@/components/tutorials/TutorialStoryVideoModal.vue'
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

// TODO: Specify the story video with a per-course field on the `Course` API instead of the
// query param, once the backend supports it.
const storyVideoUrl = computed(() => {
  const usercontentOrigin = getUsercontentOrigin()
  return resolveStoryVideoUrl(
    route.query.video,
    tutorialStoryVideoUrl,
    usercontentOrigin != null ? [usercontentOrigin] : []
  )
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

// Without a story video configured, start the course right after loading, as before.
watch(
  () => allQueryRet.data.value,
  (data) => {
    if (data == null || storyVideoUrl.value != null) return
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
    <TutorialStoryVideoModal
      v-else-if="allQueryRet.data.value != null && storyVideoUrl != null"
      visible
      :src="storyVideoUrl"
      @continue="handleStart"
    />
  </section>
</template>
