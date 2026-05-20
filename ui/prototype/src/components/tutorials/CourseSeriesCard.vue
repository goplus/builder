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
      <div class="h-19.5 w-full flex-none overflow-hidden bg-grey-100 p-4">
        <div class="w-full overflow-hidden text-lg whitespace-nowrap text-title text-ellipsis" :title="series.title">{{ series.title }}</div>
        <div class="mt-1 inline-flex items-center gap-3 text-sm text-hint-2">
          <span>{{ series.total }}</span>
          <span>{{ series.updatedAt }}</span>
        </div>
      </div>
    </RouterLink>
  </li>
</template>
