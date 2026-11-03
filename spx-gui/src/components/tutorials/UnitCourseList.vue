<script setup lang="ts">
import { computed } from 'vue'

import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { UIEmpty, UIError, UILoading, UITab, UITabs } from '@/components/ui'
import { useSeriesCourses } from '@/stores/course-series'
import { useRouteQueryParamInt } from '@/utils/route'
import { getSeriesUnits, getUnitLabel } from './units'

const props = defineProps<{
  /** A series divided into units, which is shown one unit at a time, all its courses at once. */
  courseSeries: CourseSeries
  numInRow: number
}>()

defineSlots<{
  course(props: { course: Course }): unknown
}>()

const units = computed(() => getSeriesUnits(props.courseSeries))
const unitParam = useRouteQueryParamInt('unit', 1)
const unitIndex = computed(() => Math.min(Math.max(unitParam.value - 1, 0), units.value.length - 1))
const unit = computed(() => units.value[unitIndex.value] ?? null)
const seriesCoursesQuery = useSeriesCourses(() => props.courseSeries.id)
const unitCourses = computed(() => {
  const courses = seriesCoursesQuery.data.value
  if (unit.value == null || courses == null) return []
  const coursesByID = new Map(courses.map((course) => [course.id, course]))
  return unit.value.courseIDs.flatMap((id) => coursesByID.get(id) ?? [])
})
</script>

<template>
  <div class="flex flex-col">
    <UIEmpty v-if="unit == null" size="large" img="box">
      {{
        $t({
          zh: `${courseSeries.title}没有可用的课程`,
          en: `${courseSeries.title} has no available courses`
        })
      }}
    </UIEmpty>
    <template v-else>
      <UITabs
        v-radar="{ name: 'unit-tabs', desc: 'Tabs to switch between the units of the course series' }"
        class="flex-wrap gap-x-6 gap-y-0 px-0"
        :value="String(unitIndex)"
        @update:value="(value) => (unitParam = Number(value) + 1)"
      >
        <UITab
          v-for="(_, index) in units"
          :key="index"
          v-radar="{
            name: 'unit-tab',
            desc: 'Click to show the courses of this unit',
            attrs: { name: $t(getUnitLabel(index)) }
          }"
          :value="String(index)"
        >
          {{ $t(getUnitLabel(index)) }}
        </UITab>
      </UITabs>
      <h3 class="mt-6 mb-4 text-lg font-semibold text-title">{{ unit.title }}</h3>
      <UILoading v-if="seriesCoursesQuery.isLoading.value" class="h-60" :mask="false" />
      <UIError v-else-if="seriesCoursesQuery.error.value != null" class="h-60" :retry="seriesCoursesQuery.refetch">
        {{ $t(seriesCoursesQuery.error.value.userMessage) }}
      </UIError>
      <ul
        v-else
        class="grid grid-cols-[repeat(var(--num-in-row),minmax(0,1fr))] gap-5"
        :style="{ '--num-in-row': numInRow }"
      >
        <template v-for="course in unitCourses" :key="course.id">
          <slot name="course" :course="course" />
        </template>
      </ul>
    </template>
  </div>
</template>
