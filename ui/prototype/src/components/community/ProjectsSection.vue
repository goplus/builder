<script setup lang="ts">
import type { Project } from '@/data/mock'
import ProjectCard from '@/components/project/ProjectCard.vue'

defineProps<{
  title: string
  linkTo?: string
  projects: Project[]
}>()
</script>

<template>
  <section class="mb-8">
    <div class="mb-3 flex h-10 items-center justify-between">
      <h2 class="m-0 text-xl font-normal text-title">{{ title }}</h2>
      <RouterLink
        v-if="linkTo"
        class="text-sm text-primary-600 no-underline hover:text-primary-700"
        :to="linkTo"
      >
        View more
      </RouterLink>
    </div>

    <ul class="m-0 grid list-none grid-cols-4 gap-5 p-0 desktop-large:grid-cols-5">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
      />
    </ul>
  </section>
</template>
