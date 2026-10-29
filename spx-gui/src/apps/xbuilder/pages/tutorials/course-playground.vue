<script setup lang="ts">
import CoursePlaygroundSession from './course-playground-session.vue'

defineOptions({ name: 'CoursePlaygroundPage' })

defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
  inPlaygroundPath: string | string[]
}>()
</script>

<template>
  <CoursePlaygroundSession
    :key="JSON.stringify([courseSeriesIdInput, courseIdInput])"
    :course-series-id-input="courseSeriesIdInput"
    :course-id-input="courseIdInput"
    :in-playground-path="inPlaygroundPath"
  />
</template>
