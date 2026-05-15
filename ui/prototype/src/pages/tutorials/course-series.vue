<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { getCourseSeries } from '@/apis/tutorials'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const series = computed(() => getCourseSeries(props.courseSeriesIdInput))

onMounted(() => {
  document.title = `${series.value.title} - XBuilder`
})
</script>

<template>
  <main class="flex-1 bg-grey-100">
    <CenteredWrapper class="grid grid-cols-[360px_minmax(0,1fr)] gap-8 py-8">
      <aside class="overflow-hidden rounded-lg border border-grey-400 bg-grey-100">
        <img class="h-56 w-full object-cover" :src="series.cover" :alt="series.title" />
        <div class="p-5">
          <h1 class="m-0 text-2xl font-medium text-title">{{ series.title }}</h1>
          <p class="mt-3 text-sm leading-6 text-hint-2">{{ series.description }}</p>
          <div class="mt-4 text-sm text-hint-1">{{ series.total }} · {{ series.updatedAt }}</div>
        </div>
      </aside>

      <section>
        <h2 class="m-0 mb-4 text-xl font-normal text-title">Courses</h2>
        <ol class="m-0 list-none space-y-3 p-0">
          <li v-for="course in series.courses" :key="course.id">
            <RouterLink
              class="flex items-center justify-between rounded-lg border border-grey-400 bg-grey-100 p-4 text-text no-underline hover:bg-grey-200"
              :to="`/course/${series.id}/${course.id}/start`"
            >
              <div>
                <h3 class="m-0 text-base font-medium text-title">{{ course.title }}</h3>
                <p class="mt-1 text-sm text-hint-1">{{ course.summary }}</p>
              </div>
              <div class="text-sm text-hint-1">{{ course.duration }}</div>
            </RouterLink>
          </li>
        </ol>
      </section>
    </CenteredWrapper>
  </main>
</template>
