<script setup lang="ts">
import { computed } from 'vue'

import { ownerAll } from '@/apis/common'
import { listCourse, type Course } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityCard from '@/components/community/CommunityCard.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TextView from '@/components/community/TextView.vue'
import CourseItem, { courseItemHeight } from '@/components/tutorials/CourseItem.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIEmpty, UIError, UIImg, UILoading, UIPagination, useResponsive } from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt } from '@/utils/route'
import { useAsyncComputed, usePageTitle } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'

const coursePadding = 20
const numInColumn = 2
const height = numInColumn * (courseItemHeight + coursePadding) - coursePadding

const props = defineProps<{
  courseSeriesId: string
}>()

const tutorial = useTutorial()

const courseSeriesQuery = useQuery(async () => getCourseSeries(props.courseSeriesId), {
  en: 'Failed to load course series',
  zh: '加载课程系列失败'
})

const {
  data: courseSeries,
  error: courseSeriesError,
  refetch: courseSeriesRefetch,
  isLoading: courseSeriesIsLoading
} = courseSeriesQuery

usePageTitle(() => {
  const parts = []
  if (courseSeries.value != null) {
    parts.push({ en: courseSeries.value.title, zh: courseSeries.value.title })
  }
  parts.push({ en: 'Course Series', zh: '课程系列' })
  return parts
})

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = courseSeries.value?.thumbnail
  if (thumbnailUniversalUrl == null || thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})

const page = useRouteQueryParamInt('p', 1)
const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const pageSize = computed(() => numInRow.value * numInColumn)
const pageTotal = computed(() => Math.ceil((courseQuery.data.value?.total ?? 0) / pageSize.value))

const courseQuery = useQuery(
  async (ctx) => {
    return listCourse(
      {
        courseSeriesID: props.courseSeriesId,
        pageIndex: page.value,
        pageSize: pageSize.value,
        orderBy: 'sequenceInCourseSeries',
        owner: ownerAll
      },
      ctx.signal
    )
  },
  { en: 'Failed to load course list', zh: '加载课程列表失败' }
)

const { fn: handleCourseClick } = useMessageHandle(
  (event: MouseEvent, course: Course, courseSeries: CourseSeries) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
      return
    }

    event.preventDefault()
    tutorial.startCourse(course, courseSeries)
  },
  {
    en: 'Failed to start course',
    zh: '开始课程失败'
  }
)
</script>

<template>
  <div class="course-series-page">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />

    <CenteredWrapper size="medium" class="content-wrapper">
      <CommunityCard class="header">
        <UILoading v-if="courseSeriesIsLoading" cover mask="solid" />
        <UIError v-else-if="courseSeriesError != null" :retry="courseSeriesRefetch">
          {{ $t(courseSeriesError.userMessage) }}
        </UIError>
        <div class="left">
          <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />
        </div>
        <div class="right">
          <template v-if="courseSeries != null">
            <h2 class="title">{{ courseSeries.title }}</h2>

            <div
              v-radar="{
                name: 'Course series details',
                desc: 'Course series description'
              }"
              class="description"
            >
              <TextView
                :text="courseSeries.description"
                :placeholder="$t({ en: 'No description yet', zh: '暂无描述' })"
              />
            </div>
          </template>
        </div>
      </CommunityCard>

      <div class="courses-wrapper">
        <div v-if="courseSeries" :style="{ '--num-in-row': numInRow }">
          <ListResultWrapper :query-ret="courseQuery" :height="height">
            <template #empty="{ style }">
              <UIEmpty size="large" img="game" :style="style">
                {{
                  $t({
                    zh: `${courseSeries.title}没有可用的课程`,
                    en: `${courseSeries.title} has no available courses`
                  })
                }}
              </UIEmpty>
            </template>
            <template #default="{ data }">
              <ul class="course-list">
                <!-- a tag are used for: link preview on hover, context menu support, and better accessibility -->
                <a
                  v-for="course in data.data"
                  :key="course.id"
                  :href="`/course/${courseSeries.id}/${course.id}/start`"
                  @click="handleCourseClick($event, course, courseSeries)"
                >
                  <CourseItem :course="course" />
                </a>
              </ul>
            </template>
          </ListResultWrapper>
        </div>
        <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
      </div>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>

<style lang="scss" scoped>
.course-series-page {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  background-color: var(--ui-color-grey-300);
}

.content-wrapper {
  margin: 24px auto;
}

.header {
  position: relative;
  padding: 20px;
  display: flex;
  gap: 40px;
  background: var(--ui-color-grey-100);

  .left {
    flex: 1 1 200px;
    aspect-ratio: 1.08;
    overflow: hidden;
    border-radius: var(--ui-border-radius-3);
    // TODO: Temporary background, replace with the latest assets
    background-image: url(@/assets/images/stage-bg.svg);

    .thumbnail {
      width: 100%;
      height: 100%;
    }
  }

  .right {
    flex: 1 1 1000px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-right: 20px;
    gap: 20px;

    .title {
      line-height: 28px;
      font-size: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: var(--ui-color-grey-1000);
    }

    .description {
      flex: 1 1 0;
      overflow: auto;
    }
  }
}

.courses-wrapper {
  display: flex;
  margin-top: 28px;
  flex-direction: column;

  .course-list {
    display: grid;
    grid-template-columns: repeat(var(--num-in-row), 1fr);
    gap: 20px;
  }

  .pagination {
    align-self: center;
    margin-top: 36px;
  }
}
</style>
