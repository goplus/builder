<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { searchCommunity } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'

const route = useRoute()
const keyword = computed(() => String(route.query.q ?? ''))
const results = computed(() => searchCommunity(keyword.value))

onMounted(() => {
  document.title = 'Search - XBuilder'
})
</script>

<template>
  <main>
    <CenteredWrapper class="pt-8 pb-10">
      <h1 class="m-0 text-2xl font-medium text-title">Search</h1>
      <p class="mt-1 text-sm text-hint-1">
        {{ keyword === '' ? 'Showing all local projects.' : `Results for "${keyword}"` }}
      </p>

      <ul v-if="results.length > 0" class="mt-5 grid list-none grid-cols-4 gap-5 p-0">
        <ProjectCard v-for="project in results" :key="project.id" :project="project" />
      </ul>
      <div v-else class="mt-8 rounded-lg border border-grey-400 bg-grey-100 p-8 text-center text-hint-1">
        No local mock projects match this search.
      </div>
    </CenteredWrapper>
  </main>
</template>
