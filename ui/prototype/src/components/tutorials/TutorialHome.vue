<script setup lang="ts">
import CenteredWrapper from '@prototype/components/community/CenteredWrapper.vue'
import CourseSeriesCard from '@prototype/components/tutorials/CourseSeriesCard.vue'
import TutorialsBanner from '@prototype/components/tutorials/TutorialsBanner.vue'
import type { TutorialCard } from '@prototype/data/tutorials'

defineProps<{
  tutorials: TutorialCard[]
}>()

defineEmits<{
  openTutorial: [tutorial: TutorialCard]
}>()
</script>

<template>
  <main class="tutorial-main">
    <TutorialsBanner />

    <CenteredWrapper class="home-content">
      <ul class="series-grid">
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
