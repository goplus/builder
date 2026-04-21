<script setup lang="ts">
import { computed } from 'vue'

import { ownerAll } from '@/apis/common'
import { listCourse, type Course } from '@/apis/course'
import { getCourseSeries, type CourseSeries } from '@/apis/course-series'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TextView from '@/components/community/TextView.vue'
import CourseItem, { courseItemHeight } from '@/components/tutorials/CourseItem.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UICard, UIEmpty, UIError, UIImg, UILoading, UIPagination, useResponsive } from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt } from '@/utils/route'
import { useAsyncComputed, usePageTitle } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
// TODO: Temporary background, replace with the latest assets
import stageBg from '@/assets/images/stage-bg.svg'

const coursePadding = 20
const numInColumn = 2
const height = numInColumn * (courseItemHeight + coursePadding) - coursePadding

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const tutorial = useTutorial()

const courseSeriesQuery = useQuery(async () => getCourseSeries(props.courseSeriesIdInput), {
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
        courseSeriesID: props.courseSeriesIdInput,
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
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-300">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />

    <CenteredWrapper size="medium" class="my-6">
      <UICard class="relative flex gap-10 bg-grey-100 p-5">
        <UILoading v-if="courseSeriesIsLoading" cover mask="solid" />
        <UIError v-else-if="courseSeriesError != null" :retry="courseSeriesRefetch">
          {{ $t(courseSeriesError.userMessage) }}
        </UIError>
        <div
          class="flex-[1_1_200px] aspect-[1.08] overflow-hidden rounded-lg"
          :style="{ backgroundImage: `url(${stageBg})` }"
        >
          <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
        </div>
        <div class="flex-[1_1_1000px] mr-5 flex flex-col gap-5 overflow-hidden">
          <template v-if="courseSeries != null">
            <h2 class="overflow-hidden text-2xl whitespace-nowrap text-ellipsis text-grey-1000">
              {{ courseSeries.title }}
            </h2>

            <div
              v-radar="{
                name: 'Course series details',
                desc: 'Course series description'
              }"
              class="flex-[1_1_0] overflow-auto"
            >
              <TextView
                :text="courseSeries.description"
                :placeholder="$t({ en: 'No description yet', zh: '暂无描述' })"
              />
            </div>
          </template>
        </div>
      </UICard>

      <div class="mt-7 flex flex-col">
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
              <ul class="grid grid-cols-[repeat(var(--num-in-row),minmax(0,1fr))] gap-5">
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
        <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 self-center" :total="pageTotal" />
      </div>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>
