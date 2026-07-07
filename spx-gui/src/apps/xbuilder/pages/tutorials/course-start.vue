<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { getCourse } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { tutorialIntroVideoUrl } from '@/apps/xbuilder/env'
import CourseIntroVideo from '@/components/tutorials/CourseIntroVideo.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { ActionException, capture, useAction } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()

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

const isStartingCourse = ref(false)
const startCourseError = shallowRef<ActionException | null>(null)

const startCourse = useAction(async () => {
  const data = allQueryRet.data.value
  if (data == null) throw new Error('course data is not loaded')
  await tutorial.startCourse(data.course, data.courseSeries)
}, {
  en: 'Failed to start course',
  zh: '启动课程失败'
})

async function handleIntroContinue() {
  startCourseError.value = null
  isStartingCourse.value = true
  try {
    await startCourse()
  } catch (e) {
    isStartingCourse.value = false
    if (e instanceof ActionException) {
      startCourseError.value = e
    } else {
      capture(e, 'start course')
    }
  }
}
</script>

<template>
  <section class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading
      v-if="allQueryRet.isLoading.value || isStartingCourse"
      :percentage="isStartingCourse ? 100 : allQueryRet.progress.value.percentage"
    >
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
    <UIError v-else-if="startCourseError != null" :retry="handleIntroContinue">
      {{ $t(startCourseError.userMessage) }}
    </UIError>
    <CourseIntroVideo v-else-if="allQueryRet.data.value != null" :src="tutorialIntroVideoUrl" @continue="handleIntroContinue" />
  </section>
</template>
