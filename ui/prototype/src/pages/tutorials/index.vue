<script setup lang="ts">
import { ref } from 'vue'

import CommunityFooter from '@prototype/components/community/CommunityFooter.vue'
import CommunityNavbar from '@prototype/components/community/CommunityNavbar.vue'
import TutorialHome from '@prototype/components/tutorials/TutorialHome.vue'
import { tutorials, type TutorialCard } from '@prototype/data/tutorials'
import { usePageTitle } from '@/utils/utils'
import '@prototype/styles/app.css'

usePageTitle({
  en: 'Tutorials',
  zh: '教程'
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
