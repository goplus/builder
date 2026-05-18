<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { searchCommunity } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import emptyGameIcon from '@/assets/empty/game.svg'

const route = useRoute()
const keyword = computed(() => String(route.query.q ?? ''))
const results = computed(() => searchCommunity(keyword.value))
const order = ref(String(route.query.o ?? 'update'))
const displayedResults = computed(() => {
  const sorted = [...results.value]
  if (order.value === 'likes') return sorted.sort((a, b) => b.likes - a.likes)
  if (order.value === 'remix') return sorted.sort((a, b) => b.remixes - a.remixes)
  return sorted.reverse()
})

onMounted(() => {
  document.title = 'Project search results - XBuilder'
})
</script>

<template>
  <main class="flex-1">
    <CommunityHeader>
      <template v-if="keyword !== ''">
        Found {{ results.length }} projects for "<span class="text-primary-main">{{ keyword }}</span>"
      </template>
      <template v-else>Search projects</template>
      <template #options>
        <span class="flex items-center gap-2 text-sm text-title">
          Sort by
          <select
            v-model="order"
            class="h-8 rounded-md border border-grey-400 bg-grey-100 px-3 text-sm text-title outline-none"
            aria-label="Sort search results"
          >
            <option value="update">Recently updated</option>
            <option value="likes">Most likes</option>
            <option value="remix">Most remixes</option>
          </select>
        </span>
      </template>
    </CommunityHeader>

    <CenteredWrapper class="flex flex-col gap-5 py-5">
      <ul v-if="displayedResults.length > 0" class="grid list-none grid-cols-4 gap-5 p-0 m-0">
        <ProjectCard v-for="project in displayedResults" :key="project.id" :project="project" />
      </ul>
      <div v-else class="flex h-132 w-full flex-col items-center justify-center gap-3 text-xl text-grey-1000">
        <img class="h-20 w-18.5" :src="emptyGameIcon" alt="" />
        <span>No projects</span>
      </div>
    </CenteredWrapper>
  </main>
</template>
