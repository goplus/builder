<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CourseSeriesCard from '@/components/tutorials/CourseSeriesCard.vue'
import TutorialsBanner from '@/components/tutorials/TutorialsBanner.vue'
import type { TutorialCard } from '@/data/tutorials'

defineProps<{
  tutorials: TutorialCard[]
}>()

defineEmits<{
  openTutorial: [tutorial: TutorialCard]
}>()
</script>

<template>
  <main class="flex-1">
    <TutorialsBanner />

    <CenteredWrapper class="pt-3 pb-10">
      <h2 class="mb-1.5 flex h-15 w-full items-center justify-start text-xl leading-6 font-normal text-title">All Tutorials</h2>

      <ul class="grid list-none grid-cols-4 justify-center gap-5 p-0 m-0">
        <CourseSeriesCard
          v-for="tutorial in tutorials"
          :key="tutorial.id"
          :tutorial="tutorial"
          @select="$emit('openTutorial', $event)"
        />
      </ul>
    </CenteredWrapper>
  </main>
</template>
