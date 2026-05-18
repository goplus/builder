<script setup lang="ts">
import type { CourseSeries } from '@/data/mock'

defineProps<{
  series: CourseSeries
}>()
</script>

<template>
  <li>
    <RouterLink
      class="block h-63.5 w-58 overflow-hidden rounded-lg border border-grey-400 bg-grey-100 p-0 text-left text-text no-underline transition-transform duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-sm"
      :to="`/course-series/${series.id}`"
    >
      <div class="h-43.5 w-58 overflow-hidden border-b border-grey-400 bg-grey-300" aria-hidden="true">
        <img class="block size-full object-cover" :src="series.cover" alt="" />
      </div>
      <div class="flex h-19.5 flex-col gap-1 bg-grey-100 p-4">
        <h2 class="overflow-hidden text-base leading-5.5 font-normal whitespace-nowrap text-title text-ellipsis">{{ series.title }}</h2>
        <div class="flex items-center gap-3 text-sm leading-5 text-hint-1">
          <span>{{ series.total }}</span>
          <span>{{ series.updatedAt }}</span>
        </div>
      </div>
    </RouterLink>
  </li>
</template>
