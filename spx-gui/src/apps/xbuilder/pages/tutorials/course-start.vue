<script setup lang="ts">
import CourseStartSession from './course-start-session.vue'

defineOptions({ name: 'CourseStartPage' })

defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()
</script>

<template>
  <CourseStartSession
    :key="JSON.stringify([courseSeriesIdInput, courseIdInput])"
    :course-series-id-input="courseSeriesIdInput"
    :course-id-input="courseIdInput"
  />
</template>
