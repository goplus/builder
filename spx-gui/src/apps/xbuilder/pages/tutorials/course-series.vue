<script setup lang="ts">
import { computed } from 'vue'

import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TextView from '@/components/community/TextView.vue'
import CourseItem from '@/components/tutorials/CourseItem.vue'
import PagedCourseList from '@/components/tutorials/PagedCourseList.vue'
import UnitCourseList from '@/components/tutorials/UnitCourseList.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UICard, UIError, UIImg, UILoading, useResponsive } from '@/components/ui'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useSeries } from '@/stores/course-series'
import { useEnsureSignedIn } from '@/utils/user'
import { useAsyncComputed, usePageTitle } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
// TODO: Temporary background, replace with the latest assets
import stageBg from '@/assets/images/stage-bg.svg'

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const tutorial = useTutorial()
const ensureSignedIn = useEnsureSignedIn()

const courseSeriesQuery = useSeries(() => props.courseSeriesIdInput)

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

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))

const { fn: handleCourseClick } = useMessageHandle(
  async (event: MouseEvent, course: Course, courseSeries: CourseSeries) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
      return
    }

    event.preventDefault()
    await ensureSignedIn({
      returnTo: tutorial.getCourseStartRoute(courseSeries.id, course.id),
      content: {
        en: 'Sign in to start learning this course.',
        zh: '登录后即可开始学习这节课程。'
      }
    })
    return tutorial.startCourse(courseSeries.id, course.id)
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

    <CenteredWrapper size="medium" class="my-6 flex-[1_0_auto]">
      <UICard class="h-[145px] flex gap-10 bg-grey-100 p-5">
        <UILoading v-if="courseSeriesIsLoading" cover mask="solid" />
        <UIError v-else-if="courseSeriesError != null" :retry="courseSeriesRefetch">
          {{ $t(courseSeriesError.userMessage) }}
        </UIError>
        <div
          class="flex-none w-35 aspect-4/3 overflow-hidden rounded-sm"
          :style="{ backgroundImage: `url(${stageBg})` }"
        >
          <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
        </div>
        <div class="flex-auto flex flex-col gap-3 overflow-hidden">
          <template v-if="courseSeries != null">
            <h2 class="flex-none overflow-hidden whitespace-nowrap text-ellipsis text-2xl text-title">
              {{ courseSeries.title }}
            </h2>

            <div
              v-radar="{
                name: 'course-series-details',
                desc: 'Course series description'
              }"
              class="flex-auto overflow-auto"
            >
              <TextView
                :text="courseSeries.description"
                :placeholder="$t({ en: 'No description yet', zh: '暂无描述' })"
              />
            </div>
          </template>
        </div>
      </UICard>

      <template v-if="courseSeries != null">
        <component
          :is="courseSeries.units.length > 0 ? UnitCourseList : PagedCourseList"
          class="mt-7"
          :course-series="courseSeries"
          :num-in-row="numInRow"
        >
          <template #course="{ course }">
            <!-- a tag are used for: link preview on hover, context menu support, and better accessibility -->
            <a
              :href="tutorial.getCourseStartRoute(courseSeries.id, course.id)"
              class="no-underline"
              @click="handleCourseClick($event, course, courseSeries)"
            >
              <CourseItem :course="course" />
            </a>
          </template>
        </component>
      </template>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>
