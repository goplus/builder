<script setup lang="ts">
import { getProjectRoute } from '@/apis/project'
import type { Project } from '@/data/mock'

defineProps<{
  project: Project
}>()
</script>

<template>
  <li>
    <RouterLink
      class="block overflow-hidden rounded-lg border border-grey-400 bg-grey-100 text-text no-underline shadow-none transition hover:-translate-y-0.5 hover:shadow-sm"
      :to="getProjectRoute(project)"
    >
      <div class="h-36 overflow-hidden border-b border-grey-400 bg-grey-300">
        <img class="block size-full object-cover" :src="project.thumbnail" :alt="project.title" />
      </div>
      <div class="p-4">
        <h3 class="m-0 overflow-hidden text-base font-medium whitespace-nowrap text-title text-ellipsis">
          {{ project.title }}
        </h3>
        <div class="mt-2 flex items-center gap-2">
          <img class="size-6 rounded-full border border-grey-400 object-cover" :src="project.owner.avatar" alt="" />
          <span class="min-w-0 overflow-hidden text-sm whitespace-nowrap text-hint-2 text-ellipsis">
            {{ project.owner.displayName }}
          </span>
        </div>
        <div class="mt-3 flex gap-3 text-xs text-hint-1">
          <span>{{ project.likes }} likes</span>
          <span>{{ project.remixes }} remixes</span>
        </div>
      </div>
    </RouterLink>
  </li>
</template>
