<template>
  <div class="tutorials-wrapper">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />

    <CenteredWrapper class="centered-wrapper">
      <!-- banner slot -->

      <div class="course-series-wrapper">
        <ListResultWrapper :query-ret="courseSeriesQuery">
          <template #empty>
            <UIEmpty size="extra-large">
              {{ $t({ en: 'No course series available', zh: '没有可用的课程系列' }) }}
            </UIEmpty>
          </template>
          <ul class="course-series-list">
            <CourseSeriesItem
              v-for="courseSeries in courseSeriesQuery.data.value"
              :key="courseSeries.id"
              :course-series-id="courseSeries.id"
              :course-i-ds="courseSeries.courseIDs"
              :title="courseSeries.title"
            >
              <template #default="{ data: courseList }">
                <CourseItem
                  v-for="course in courseList"
                  :key="course.id"
                  :course="course"
                  @click="handleCourseClick(course, courseSeries, courseList)"
                />
              </template>
            </CourseSeriesItem>
          </ul>
        </ListResultWrapper>
      </div>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { sortBy } from 'lodash'
import { useQuery } from '@/utils/query'

import { listCourseSeries, type CourseSeries } from '@/apis/course-series'
import { ownerAll } from '@/apis/common'
import type { Course } from '@/apis/course'

import { UIEmpty } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CourseSeriesItem from '@/components/tutorials/CourseSeriesItem.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseItem from '@/components/tutorials/CourseItem.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import { useTutorial } from '@/components/tutorials/tutorial'

const tutorial = useTutorial()

const courseSeriesQuery = useQuery(
  async () => {
    const { data } = await listCourseSeries({ owner: ownerAll })
    return sortBy(data, ['order'])
  },
  { en: 'Failed to load course series', zh: '加载课程系列失败' }
)

function handleCourseClick(course: Course, courseSeries: CourseSeries, courseList: Course[]) {
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

  .centered-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;

    .course-series-wrapper {
      margin: 32px 0;

      .course-series-list {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      &:not(:has(.course-series-list)) {
        margin: auto;
      }
    }
  }
}
</style>
