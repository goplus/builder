<script setup lang="ts">
import { computed } from 'vue'

import { listCourses, type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { courseItemHeight } from '@/components/tutorials/CourseItem.vue'
import { UIEmpty, UIPagination } from '@/components/ui'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt } from '@/utils/route'

const coursePadding = 20
const numInColumn = 2
const height = numInColumn * (courseItemHeight + coursePadding) - coursePadding

const props = defineProps<{
  /** A series not divided into units, whose courses are shown a page at a time. */
  courseSeries: CourseSeries
  numInRow: number
}>()

defineSlots<{
  course(props: { course: Course }): unknown
}>()

const page = useRouteQueryParamInt('p', 1)
const pageSize = computed(() => props.numInRow * numInColumn)
const pageTotal = computed(() => Math.ceil((courseQuery.data.value?.total ?? 0) / pageSize.value))

const courseQuery = useQuery(
  async (ctx) => {
    return listCourses(
      {
        courseSeriesID: props.courseSeries.id,
        pageIndex: page.value,
        pageSize: pageSize.value,
        orderBy: 'sequenceInCourseSeries'
      },
      ctx.signal
    )
  },
  { en: 'Failed to load course list', zh: '加载课程列表失败' }
)
</script>

<template>
  <div class="flex flex-col">
    <div :style="{ '--num-in-row': numInRow }">
      <ListResultWrapper :query-ret="courseQuery" :height="height">
        <template #empty="{ style }">
          <UIEmpty size="large" img="box" :style="style">
            {{
              $t({
                zh: `${courseSeries.title}没有可用的课程`,
                en: `${courseSeries.title} has no available courses`
              })
            }}
          </UIEmpty>
        </template>
        <template #default="{ data }">
          <ul class="grid grid-cols-[repeat(var(--num-in-row),minmax(0,1fr))] gap-5">
            <template v-for="course in data.data" :key="course.id">
              <slot name="course" :course="course" />
            </template>
          </ul>
        </template>
      </ListResultWrapper>
    </div>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 self-center" :total="pageTotal" />
  </div>
</template>
