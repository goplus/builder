<script setup lang="ts">
import { computed } from 'vue'

import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseItemHeight } from '@/components/tutorials/CourseItem.vue'
import { UIEmpty, UIPagination } from '@/components/ui'
import { useRouteQueryParamInt } from '@/utils/route'

const coursePadding = 20
const numInColumn = 2
const height = numInColumn * (courseItemHeight + coursePadding) - coursePadding

const props = defineProps<{
  /** A series not divided into units, whose courses are shown a page at a time. */
  courseSeries: CourseSeries
  numInRow: number
  courses: Course[]
}>()

defineSlots<{
  course(props: { course: Course }): unknown
}>()

const requestedPage = useRouteQueryParamInt('p', 1)
const page = computed({
  get: () => Math.max(1, Math.min(requestedPage.value, pageTotal.value)),
  set: (value) => (requestedPage.value = value)
})
const pageSize = computed(() => props.numInRow * numInColumn)
const pageTotal = computed(() => Math.ceil(props.courses.length / pageSize.value))

const shownCourses = computed(() => props.courses.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
</script>

<template>
  <div class="flex flex-col">
    <div :style="{ '--num-in-row': numInRow }">
      <template v-if="courses.length === 0">
        <UIEmpty size="large" img="box" :style="{ height: `${height}px` }">
          {{
            $t({
              zh: `${courseSeries.title}没有可用的课程`,
              en: `${courseSeries.title} has no available courses`
            })
          }}
        </UIEmpty>
      </template>
      <template v-else>
        <ul class="grid grid-cols-[repeat(var(--num-in-row),minmax(0,1fr))] gap-5">
          <template v-for="course in shownCourses" :key="course.id">
            <slot name="course" :course="course" />
          </template>
        </ul>
      </template>
    </div>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 self-center" :total="pageTotal" />
  </div>
</template>
