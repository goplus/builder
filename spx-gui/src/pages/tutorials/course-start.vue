<script setup lang="ts">
import { ownerAll } from '@/apis/common'
import { getCourse, listAllCourses } from '@/apis/course'
import { getCourseSeries } from '@/apis/course-series'
import { orderBy, useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { composeQuery, useQuery } from '@/utils/query'

const props = defineProps<{
  courseSeriesId: string
  courseId: string
}>()

const tutorial = useTutorial()

const courseSeriesQuery = useQuery(async () => getCourseSeries(props.courseSeriesId), {
  en: 'Failed to load course series',
  zh: '加载课程系列失败'
})
const coursesQuery = useQuery(
  async () => {
    const data = await listAllCourses({
      courseSeriesID: props.courseSeriesId,
      owner: ownerAll
    })
    return data
  },
  { en: 'Failed to load courses', zh: '加载课程列表失败' }
)
const courseQuery = useQuery(async () => await getCourse(props.courseId), {
  en: 'Failed to load course',
  zh: '加载课程失败'
})

const allQueryRet = useQuery(
  async (ctx) => {
    const [courseSeries, courses, course] = await Promise.all([
      composeQuery(ctx, courseSeriesQuery, [{ en: 'Loading course series...', zh: '加载课程系列...' }, 1]),
      composeQuery(ctx, coursesQuery, [{ en: 'Loading courses...', zh: '加载课程列表...' }, 1]),
      composeQuery(ctx, courseQuery, [{ en: 'Loading course...', zh: '加载课程...' }, 1])
    ])
    await tutorial.startCourse(course, { ...courseSeries, courses: orderBy(courses, courseSeries.courseIDs) })
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  }
)
</script>

<template>
  <section class="course-start-page">
    <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>

<style lang="scss" scoped>
.course-start-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
