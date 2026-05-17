<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { exploreProjects } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'

const route = useRoute()
const order = computed(() => String(route.query.o ?? 'likes'))
const projects = computed(() => exploreProjects(order.value))

onMounted(() => {
  document.title = 'Explore - XBuilder'
})
</script>

<template>
  <main>
    <CenteredWrapper class="pt-8 pb-10">
      <div class="mb-5 flex items-end justify-between">
        <div>
          <h1 class="m-0 text-2xl font-medium text-title">Explore</h1>
          <p class="mt-1 text-sm text-hint-1">Browse fake local projects with the same route shape as the real community.</p>
        </div>
        <div class="flex overflow-hidden rounded-md border border-grey-400 bg-grey-100 text-sm">
          <RouterLink class="px-3 py-2 text-title no-underline hover:bg-grey-300" to="/explore?o=likes">Most recent likes</RouterLink>
          <RouterLink class="px-3 py-2 text-title no-underline hover:bg-grey-300" to="/explore?o=remix">Most recent remixes</RouterLink>
          <RouterLink class="px-3 py-2 text-title no-underline hover:bg-grey-300" to="/explore?o=following">My following created</RouterLink>
        </div>
      </div>

      <ProjectsSection title="Community projects" :projects="projects" />
    </CenteredWrapper>
  </main>
</template>
