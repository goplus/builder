<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getCourse, getCourseSeries } from '@/apis/tutorials'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const series = computed(() => getCourseSeries(props.courseSeriesIdInput))
const course = computed(() => getCourse(props.courseSeriesIdInput, props.courseIdInput))
const step = ref(1)

onMounted(() => {
  document.title = `${course.value.title} - XBuilder`
})
</script>

<template>
  <main class="flex-1 bg-grey-100">
    <CenteredWrapper class="grid grid-cols-[260px_minmax(0,1fr)] gap-6 py-8">
      <aside class="rounded-lg border border-grey-400 bg-grey-100 p-4">
        <RouterLink class="text-sm text-primary-600 no-underline" :to="`/course-series/${series.id}`">
          Back to series
        </RouterLink>
        <h1 class="mt-4 text-xl font-medium text-title">{{ course.title }}</h1>
        <p class="text-sm leading-6 text-hint-2">{{ course.summary }}</p>
      </aside>

      <section class="rounded-lg border border-grey-400 bg-grey-100 p-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h2 class="m-0 text-2xl font-medium text-title">{{ series.title }}</h2>
            <p class="mt-1 text-sm text-hint-1">Local tutorial preview · step {{ step }} of 3</p>
          </div>
          <button class="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white" type="button" @click="step = step === 3 ? 1 : step + 1">
            Continue
          </button>
        </div>
        <div class="grid min-h-100 place-items-center rounded-lg bg-grey-300">
          <div class="max-w-120 text-center">
            <img class="mx-auto h-44 object-contain" src="@ui-images/boy.png" alt="" />
            <p class="mt-4 text-base leading-7 text-text">
              Follow the highlighted action in the offline prototype. The state changes locally and does not require a server.
            </p>
          </div>
        </div>
      </section>
    </CenteredWrapper>
  </main>
</template>
