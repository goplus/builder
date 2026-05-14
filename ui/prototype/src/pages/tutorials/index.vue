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
  <div class="flex min-h-screen min-w-360 flex-col bg-grey-100 font-main text-text">
    <CommunityNavbar />

    <TutorialHome
      :tutorials="tutorials"
      @open-tutorial="openTutorial"
    />

    <div
      v-if="activeTutorial"
      class="fixed right-6 bottom-[72px] z-30 rounded-md bg-grey-1000 px-4 py-3 text-sm text-grey-100 shadow-sm"
      role="status"
    >
      Opening {{ activeTutorial.title }}
    </div>

    <CommunityFooter />
  </div>
</template>
