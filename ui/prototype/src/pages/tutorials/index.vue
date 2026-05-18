<script setup lang="ts">
import { onMounted } from 'vue'

import TutorialHome from '@/components/tutorials/TutorialHome.vue'
import { listCourseSeries } from '@/apis/tutorials'

onMounted(() => {
  document.title = 'Tutorials - XBuilder'
})

const tutorials = listCourseSeries()
</script>

<template>
  <TutorialHome :tutorials="tutorials" />
</template>
