<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TutorialHome from '@/components/tutorials/TutorialHome.vue'
import { tutorials, type TutorialCard } from '@/data/tutorials'

onMounted(() => {
  document.title = 'Tutorials - XBuilder'
})

const activeTutorial = ref<TutorialCard | null>(null)

function openTutorial(tutorial: TutorialCard) {
  activeTutorial.value = tutorial
}
</script>

<template>
  <div class="prototype-tutorial-page">
    <CommunityNavbar />

    <TutorialHome
      :tutorials="tutorials"
      @open-tutorial="openTutorial"
    />

    <div v-if="activeTutorial" class="toast" role="status">
      Opening {{ activeTutorial.title }}
    </div>

    <CommunityFooter />
  </div>
</template>
