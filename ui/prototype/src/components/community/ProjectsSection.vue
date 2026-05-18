<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '@/data/mock'
import ProjectCard from '@/components/project/ProjectCard.vue'

const props = defineProps<{
  title: string
  linkText?: string
  linkTo?: string
  projects: Project[]
  context?: 'home' | 'user' | 'project'
  cardContext?: 'public' | 'mine'
}>()

const gridClass = computed(() => {
  return props.context === 'project'
    ? 'grid-cols-5 desktop-large:grid-cols-6'
    : 'grid-cols-4 desktop-large:grid-cols-5'
})
</script>

<template>
  <section>
    <header v-if="title || linkTo" class="flex h-13 items-center justify-between">
      <h2 class="m-0 text-2xl font-normal text-title">{{ title }}</h2>
      <RouterLink
        v-if="linkTo"
        class="link-primary flex items-center text-lg"
        :to="linkTo"
      >
        {{ linkText ?? 'View more' }}
        <svg class="ml-2 size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M13.9844 6.48491C14.2692 6.20044 14.731 6.20025 15.0156 6.48491L18.0156 9.48491C18.0418 9.51109 18.0646 9.53999 18.0859 9.56889C18.1335 9.63341 18.1719 9.70543 18.1963 9.78374L18.2158 9.86186C18.2339 9.95531 18.2326 10.0517 18.2139 10.1451C18.1911 10.2585 18.1411 10.362 18.0723 10.4498C18.0545 10.4724 18.0365 10.4953 18.0156 10.5162L15.0156 13.5162C14.731 13.8004 14.269 13.8004 13.9844 13.5162C13.7 13.2314 13.6998 12.7696 13.9844 12.4849L15.7383 10.73H2.5C2.09737 10.73 1.77063 10.4031 1.77051 10.0005C1.77071 9.59799 2.09742 9.27202 2.5 9.27202H15.7402L13.9844 7.51616C13.6996 7.23142 13.6997 6.76967 13.9844 6.48491Z" fill="currentColor" />
        </svg>
      </RouterLink>
    </header>

    <ul class="relative mt-2 mb-8 grid list-none gap-5 p-0" :class="gridClass">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :context="cardContext"
      />
    </ul>
  </section>
</template>
