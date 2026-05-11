<script setup lang="ts">
import { computed, ref } from 'vue'

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

const searchKeyword = ref('')
const activeTutorial = ref<TutorialCard | null>(null)

const visibleTutorials = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword === '') return tutorials
  return tutorials.filter((item) =>
    [item.title, item.total, item.updatedAt].join(' ').toLowerCase().includes(keyword)
  )
})

function goHome() {
  activeTutorial.value = null
  searchKeyword.value = ''
}

function openTutorial(tutorial: TutorialCard) {
  activeTutorial.value = tutorial
}
</script>

<template>
  <div class="prototype-tutorial-page">
    <CommunityNavbar @home="goHome" @search="searchKeyword = $event" />

    <TutorialHome
      :tutorials="visibleTutorials"
      @open-tutorial="openTutorial"
    />

    <div v-if="activeTutorial" class="toast" role="status">
      Opening {{ activeTutorial.title }}
    </div>

    <CommunityFooter />
  </div>
</template>
