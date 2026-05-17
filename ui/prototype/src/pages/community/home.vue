<script setup lang="ts">
import { onMounted } from 'vue'

import { getCommunityHome } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'

const home = getCommunityHome()

onMounted(() => {
  document.title = 'XBuilder'
})
</script>

<template>
  <main>
    <CenteredWrapper class="mt-5 pb-10">
      <ProjectsSection title="Your projects" link-text="View all" link-to="/user/code-kiko/projects" :projects="home.mine" />
      <ProjectsSection title="The community is liking" link-to="/explore?o=likes" :projects="home.liked" />
      <ProjectsSection title="The community is remixing" link-to="/explore?o=remix" :projects="home.remixing" />
      <ProjectsSection title="Users you follow are creating" link-to="/explore?o=following" :projects="home.following" />
    </CenteredWrapper>
  </main>
</template>
