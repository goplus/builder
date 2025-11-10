<script setup lang="ts">
defineProps<{
  courseSeriesId: string
}>()
</script>

<template>
  <section class="course-series-page">
    {{ courseSeriesId }}
  </section>
</template>

<style lang="scss" scoped>
.course-series-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
