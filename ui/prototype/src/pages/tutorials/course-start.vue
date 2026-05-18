<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

import { getCourse, getCourseSeries, getNextCourse } from '@/apis/tutorials'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import UIButton from '@/components/ui/UIButton.vue'
import UICard from '@/components/ui/UICard.vue'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const step = ref(1)
const series = computed(() => getCourseSeries(props.courseSeriesIdInput))
const course = computed(() => getCourse(props.courseSeriesIdInput, props.courseIdInput))
const nextCourse = computed(() => getNextCourse(props.courseSeriesIdInput, props.courseIdInput))

function continueCourse() {
  step.value = step.value === 3 ? 1 : step.value + 1
}

watchEffect(() => {
  document.title = `${course.value.title} - XBuilder`
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="grid grid-cols-[270px_minmax(0,1fr)] gap-6 py-8" size="large">
      <UICard class="h-fit p-4">
        <RouterLink class="text-sm text-primary-600 no-underline" :to="`/course-series/${series.id}`">Back to series</RouterLink>
        <h1 class="mt-4 text-xl font-medium text-title">{{ course.title }}</h1>
        <p class="text-sm leading-6 text-hint-2">{{ course.summary }}</p>
        <div class="mt-5 rounded-md bg-primary-100 p-3 text-sm text-primary-700">
          Local tutorial preview · step {{ step }} of 3
        </div>
      </UICard>

      <UICard class="p-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h2 class="m-0 text-2xl font-medium text-title">{{ series.title }}</h2>
            <p class="mt-1 text-sm text-hint-1">{{ course.duration }} · offline prototype walkthrough</p>
          </div>
          <div class="flex gap-2">
            <RouterLink
              v-if="nextCourse"
              class="inline-flex h-9 items-center justify-center rounded-sm border border-grey-400 bg-grey-100 px-3 text-sm font-medium text-grey-900 no-underline hover:bg-grey-200"
              :to="`/course/${series.id}/${nextCourse.id}/start`"
            >
              Next course
            </RouterLink>
            <UIButton type="primary" @click="continueCourse">Continue</UIButton>
          </div>
        </div>
        <div class="grid min-h-100 place-items-center rounded-md bg-grey-300">
          <div class="max-w-120 text-center">
            <img class="mx-auto h-44 object-contain" src="@ui-images/boy.png" alt="" />
            <p class="mt-4 text-base leading-7 text-text">
              Follow the highlighted action in the offline prototype. The state changes locally and does not require a server.
            </p>
          </div>
        </div>
      </UICard>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
