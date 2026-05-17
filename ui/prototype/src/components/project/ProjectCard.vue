<script setup lang="ts">
import { getProjectRoute } from '@/apis/project'
import type { Project } from '@/data/mock'
import stageBgUrl from '@/assets/stage-bg.svg'

defineProps<{
  project: Project
}>()
</script>

<template>
  <li class="group w-58 flex-none overflow-hidden rounded-md border border-grey-400 bg-grey-100 transition-all duration-100 hover:shadow-sm">
    <RouterLink
      class="flex flex-col text-text no-underline"
      :to="getProjectRoute(project)"
    >
      <div class="relative h-43 w-full bg-contain bg-center" :style="{ backgroundImage: `url(${stageBgUrl})` }">
        <img class="block size-full object-cover" :src="project.thumbnail" :alt="project.title" />
      </div>
      <div class="p-4">
        <div class="flex items-center gap-1">
          <h5 class="m-0 min-w-0 shrink truncate text-lg leading-6 font-normal text-title" :title="project.title">
            {{ project.title }}
          </h5>
        </div>
        <p class="m-0 mt-1 flex h-5 gap-3 text-sm text-grey-700">
          <span class="flex-none">{{ project.likes }} likes</span>
          <span class="block flex-auto truncate" :title="project.updatedAt">{{ project.updatedAt }}</span>
        </p>
      </div>
    </RouterLink>
  </li>
</template>
