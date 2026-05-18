<script setup lang="ts">
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CourseSeriesCard from '@/components/tutorials/CourseSeriesCard.vue'
import TutorialsBanner from '@/components/tutorials/TutorialsBanner.vue'
import type { CourseSeries } from '@/data/mock'

defineProps<{
  tutorials: CourseSeries[]
}>()
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <TutorialsBanner />

    <CenteredWrapper class="mt-10 mb-15 flex flex-1 flex-col items-center">
      <h2 class="mb-5 w-full text-2xl text-title">All Tutorials</h2>

      <ul class="grid list-none grid-cols-4 justify-center gap-5 p-0 m-0">
        <CourseSeriesCard
          v-for="tutorial in tutorials"
          :key="tutorial.id"
          :series="tutorial"
        />
      </ul>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
