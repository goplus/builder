<template>
  <div class="tutorials-wrapper">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />

    <TutorialsBanner />
    <CenteredWrapper class="centered-wrapper">
      <ListResultWrapper :query-ret="courseSeriesQuery" :height="436">
        <template #empty>
          <UIEmpty size="extra-large">
            {{ $t({ en: 'No course series available', zh: '没有可用的课程系列' }) }}
          </UIEmpty>
        </template>
        <template #default="{ data }">
          <ul class="course-series-list">
            <CourseSeriesItem v-for="courseSeries in data.data" :key="courseSeries.id" :course-series="courseSeries">
              <template #default="{ data: courseList }">
                <!-- a tag are used for: link preview on hover, context menu support, and better accessibility -->
                <a
                  v-for="course in courseList"
                  :key="course.id"
                  :href="`/course/${courseSeries.id}/${course.id}/start`"
                  @click="handleCourseClick($event, course, courseSeries, courseList)"
                >
                  <CourseItem :course="course" />
                </a>
              </template>
            </CourseSeriesItem>
          </ul>
        </template>
      </ListResultWrapper>

      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'

import { type CourseSeries, listCourseSeries } from '@/apis/course-series'
import type { Course } from '@/apis/course'

import { UIEmpty, UIPagination } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CourseSeriesItem from '@/components/tutorials/CourseSeriesItem.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseItem from '@/components/tutorials/CourseItem.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import TutorialsBanner from '@/components/tutorials/TutorialsBanner.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { ownerAll } from '@/apis/common'
import { useRouteQueryParamInt } from '@/utils/route'

usePageTitle({
  en: 'Tutorials',
  zh: '教程'
})

const tutorial = useTutorial()

const page = useRouteQueryParamInt('p', 1)
const courseSeriesQuery = useQuery(
  (ctx) =>
    listCourseSeries(
      {
        owner: ownerAll,
        pageIndex: page.value,
        pageSize,
        orderBy: 'order',
        sortOrder: 'asc'
      },
      ctx.signal
    ),
  {
    en: 'Failed to load course series',
    zh: '加载课程系列失败'
  }
)
const pageSize = 5
const pageTotal = computed(() => Math.ceil((courseSeriesQuery.data.value?.total ?? 0) / pageSize))

function handleCourseClick(event: MouseEvent, course: Course, courseSeries: CourseSeries, courseList: Course[]) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
    return
  }

  event.preventDefault()
  tutorial.startCourse(course, {
    ...courseSeries,
    courses: courseList
  })
}
</script>

<style lang="scss" scoped>
.tutorials-wrapper {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  background-color: var(--ui-color-grey-300);

  .centered-wrapper {
    display: flex;
    flex-direction: column;
    margin: 32px auto;
    flex: 1;

    .course-series-list {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
      height: 436px;
    }

    .pagination {
      align-self: center;
      margin-top: 8px;
    }

    &:not(:has(.course-series-list)) {
      margin: auto;
    }
  }
}
</style>
