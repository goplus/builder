<script setup lang="ts">
import { ownerAll } from '@/apis/common'
import { listCourse, type Course } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityCard from '@/components/community/CommunityCard.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TextView from '@/components/community/TextView.vue'
import CourseItem from '@/components/tutorials/CourseItem.vue'
import { orderBy, useTutorial } from '@/components/tutorials/tutorial'
import {
  UICollapse,
  UICollapseItem,
  UIDivider,
  UIEmpty,
  UIError,
  UIImg,
  UILoading,
  UIPagination,
  useResponsive
} from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt } from '@/utils/route'
import { useAsyncComputed } from '@/utils/utils'
import { computed } from 'vue'

const props = defineProps<{
  courseSeriesId: string
}>()

const tutorial = useTutorial()

const {
  isLoading,
  error,
  refetch,
  data: courseSeries
} = useQuery(async () => getCourseSeries(props.courseSeriesId), {
  en: 'Failed to load course series',
  zh: '加载课程系列失败'
})

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = courseSeries.value?.thumbnail || ''
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})

const page = useRouteQueryParamInt('p', 1)
const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 6 : 5))
const pageSize = computed(() => numInRow.value * 2)
const height = computed(() => Math.ceil(pageSize.value / numInRow.value) * (214 + 20)) // course item height + gap
const pageTotal = computed(() => Math.ceil((courseQuery.data.value?.total ?? 0) / pageSize.value))

const courseQuery = useQuery(
  async () => {
    const { data, ...others } = await listCourse({
      courseSeriesID: props.courseSeriesId,
      pageIndex: page.value,
      pageSize: pageSize.value,
      owner: ownerAll
    })
    return {
      ...others,
      data: orderBy(data, courseSeries.value?.courseIDs || [])
    }
  },
  { en: 'Failed to load course list', zh: '加载课程列表失败' }
)

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

<template>
  <div class="course-series-page">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />
    <CenteredWrapper size="large">
      <CommunityCard class="header">
        <UILoading v-if="isLoading" cover mask="solid" />
        <UIError v-else-if="error != null" class="error" :retry="refetch">
          {{ $t(error.userMessage) }}
        </UIError>
        <div class="left">
          <UIImg v-if="thumbnailUrl != null" class="thumbnail" :src="thumbnailUrl" size="cover" />
        </div>
        <div class="right">
          <template v-if="courseSeries != null">
            <h2 class="title">{{ courseSeries?.title }}</h2>
            <UIDivider />

            <UICollapse
              v-radar="{
                name: 'Course series details',
                desc: 'Collapsible sections showing course series description'
              }"
              class="collapse"
              :default-expanded-names="['description']"
            >
              <UICollapseItem :title="$t({ en: 'Description', zh: '描述' })" name="description">
                <TextView
                  :text="courseSeries.description"
                  :placeholder="$t({ en: 'No description yet', zh: '暂无描述' })"
                />
              </UICollapseItem>
            </UICollapse>
          </template>
        </div>
      </CommunityCard>

      <div class="courses-wrapper">
        <h2 class="title">{{ $t({ en: 'Courses', zh: '课程' }) }}</h2>
        <div
          v-if="courseSeries"
          class="course-series-warpper"
          :style="{ '--course-list-height': `${height}px`, '--num-in-row': numInRow }"
        >
          <ListResultWrapper :query-ret="courseQuery" :height="height">
            <template #empty="{ style }">
              <UIEmpty size="large" img="game" :style="style">
                {{
                  $t({
                    zh: `${courseSeries?.title}没有可用的课程`,
                    en: `${courseSeries?.title} has no available courses`
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
                  @click="handleCourseClick($event, course, courseSeries, data.data)"
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

.header {
  position: relative;
  margin-top: 24px;
  padding: 20px;
  display: flex;
  gap: 40px;
  background: var(--ui-color-grey-100);

  .left {
    flex: 1 1 160px;
    aspect-ratio: 0.96;
    overflow: hidden;
    border-radius: var(--ui-border-radius-3);

    .thumbnail {
      width: 100%;
      height: 100%;
    }
  }

  .right {
    flex: 1 1 800px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .title {
      font-size: 20px;
      word-break: break-word;
      display: -webkit-box;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .divider {
      margin: 16px 0;
    }

    .collapse {
      flex: 1 1 0;
      overflow-y: scroll;
    }
  }
}

.courses-wrapper {
  margin-top: 24px;
  display: flex;
  flex-direction: column;

  .title {
    line-height: 28px;
    margin-bottom: 16px;
    font-size: 20px;
    color: var(--ui-color-title);
  }

  .course-list {
    display: grid;
    grid-template-columns: repeat(var(--num-in-row), 0fr);
    height: var(--course-list-height);
    gap: 20px;
  }

  .pagination {
    align-self: center;
    margin-top: 16px;
  }
}
</style>
