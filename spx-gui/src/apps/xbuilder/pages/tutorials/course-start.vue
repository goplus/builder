<script setup lang="ts">
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { composeQuery, useQuery } from '@/utils/query'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const courseQueryRet = useCourse(() => props.courseIdInput)
const seriesQueryRet = useSeries(() => props.courseSeriesIdInput)

const allQueryRet = useQuery(
  async (ctx) => {
    const courseID = props.courseIdInput
    const seriesID = props.courseSeriesIdInput
    const [course, series] = await Promise.all([composeQuery(ctx, courseQueryRet), composeQuery(ctx, seriesQueryRet)])
    ctx.signal.throwIfAborted()
    if (course.id !== courseID || series.id !== seriesID) throw new Error('Course Start route changed while loading')
    await tutorial.enterCourse(course, series)
  },
  { en: 'Failed to start course', zh: '启动课程失败' }
)
</script>

<template>
  <section class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>
