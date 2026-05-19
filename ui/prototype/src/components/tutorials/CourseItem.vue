<script setup lang="ts">
import type { Course } from '@/data/mock'

defineProps<{
  course: Course
}>()
</script>

<template>
  <article class="flex h-32 flex-col justify-between rounded-md border border-grey-300 bg-grey-100 p-4 shadow-sm">
    <div>
      <h3 class="m-0 line-clamp-1 text-base font-medium text-title">{{ course.title }}</h3>
      <p class="mt-2 line-clamp-2 text-sm leading-5 text-grey-700">{{ course.summary }}</p>
    </div>
    <footer class="flex items-center justify-between text-sm text-hint-1">
      <span>{{ course.duration }}</span>
      <span>{{ course.completed ? 'Completed' : 'Not started' }}</span>
    </footer>
  </article>
</template>
