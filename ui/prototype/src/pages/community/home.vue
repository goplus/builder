<script setup lang="ts">
import { onMounted } from 'vue'

import { getCommunityHome } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import GuestBanner from '@/components/community/home/GuestBanner.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'

const home = getCommunityHome()

onMounted(() => {
  document.title = 'XBuilder'
})
</script>

<template>
  <main>
    <CenteredWrapper class="mt-5 pb-10">
      <GuestBanner class="my-3 mb-8" />
      <ProjectsSection title="The community is liking" link-to="/explore?o=likes" :projects="home.liked" />
      <ProjectsSection title="The community is remixing" link-to="/explore?o=remix" :projects="home.remixing" />
    </CenteredWrapper>
  </main>
</template>
