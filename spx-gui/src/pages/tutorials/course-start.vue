<script setup lang="ts">
import { getCourse } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
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
    await tutorial.startCourse(course, courseSeries)
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  }
)
</script>

<template>
  <section class="flex h-full w-full items-center justify-center">
    <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>
