<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { exploreProjects } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'

const route = useRoute()
const order = computed(() => String(route.query.o ?? 'likes'))
const projects = computed(() => exploreProjects(order.value))

const tabs = [
  { to: '/explore?o=likes', value: 'likes', label: 'Most recent likes' },
  { to: '/explore?o=remix', value: 'remix', label: 'Most recent remixes' },
  { to: '/explore?o=following', value: 'following', label: 'My following created' }
]

onMounted(() => {
  document.title = 'Explore - XBuilder'
})
</script>

<template>
  <main class="flex flex-1 flex-col">
    <section class="flex-none border-b border-grey-400 bg-grey-100">
      <CenteredWrapper class="flex h-16 items-center justify-between gap-5">
        <h1 class="m-0 min-w-0 flex-[1_1_0] truncate text-xl font-normal text-title">Explore</h1>
        <div class="flex flex-none gap-3" aria-label="Explore order">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.value"
            class="flex h-8 w-fit cursor-pointer items-center whitespace-nowrap rounded-md border px-4 text-sm no-underline transition-all duration-300"
            :class="order === tab.value ? 'border-primary-main bg-primary-main text-grey-100' : 'border-grey-300 bg-grey-300 text-grey-900'"
            :to="tab.to"
          >
            {{ tab.label }}
          </RouterLink>
        </div>
      </CenteredWrapper>
    </section>
    <CenteredWrapper class="flex flex-col gap-5 py-5">
      <ProjectsSection title="Community projects" :projects="projects" />
    </CenteredWrapper>
  </main>
</template>
