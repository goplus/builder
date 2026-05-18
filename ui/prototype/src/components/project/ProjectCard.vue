<script setup lang="ts">
import { computed } from 'vue'

import { getProjectRoute } from '@/apis/project'
import type { Project } from '@/data/mock'
import stageBgUrl from '@/assets/stage-bg.svg'

const props = withDefaults(defineProps<{
  project: Project
  context?: 'public' | 'mine'
}>(), {
  context: 'public'
})

const isMine = computed(() => props.context === 'mine')
const visibility = computed(() => props.project.visibility ?? 'public')
</script>

<template>
  <li class="group w-58 flex-none overflow-hidden rounded-md border border-grey-400 bg-grey-100 transition-all duration-100 hover:shadow-sm">
    <RouterLink
      class="flex flex-col text-text no-underline"
      :to="getProjectRoute(project)"
    >
      <div class="relative h-43 w-full bg-contain bg-center" :style="{ backgroundImage: `url(${stageBgUrl})` }">
        <img class="block size-full object-cover" :src="project.thumbnail" :alt="project.title" />
        <div v-if="!isMine" class="absolute -bottom-2.25 left-0 h-3.25 w-full bg-grey-100">
          <svg
            class="absolute bottom-0 left-0"
            xmlns="http://www.w3.org/2000/svg"
            width="67"
            height="31"
            viewBox="0 0 67 31"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M48.67 11.94C43.36 6.71 39.42 0 29.3 0H28.7C18.58 0 14.64 6.71 9.33 11.94C5.47 16.76 -2.39 17.81 -9 18V31H67V18C60.39 17.81 52.53 16.76 48.67 11.94Z"
              fill="white"
            />
          </svg>
          <span
            class="absolute -bottom-0.5 left-3.5 block size-9 overflow-hidden rounded-full border-2 border-grey-100 bg-grey-100"
          >
            <img class="block size-full object-cover" :src="project.owner.avatar" :alt="project.owner.displayName" />
          </span>
        </div>
      </div>
      <div class="p-4">
        <div class="flex items-center gap-1">
          <h5 class="m-0 min-w-0 shrink truncate text-xl leading-6 font-normal text-title" :title="project.title">
            {{ project.title }}
          </h5>
          <span
            v-if="isMine"
            class="inline-flex size-4 flex-none items-center justify-center"
            :title="visibility === 'public' ? 'Public' : 'Private'"
            :aria-label="visibility === 'public' ? 'Public project' : 'Private project'"
          >
            <svg v-if="visibility === 'public'" class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M15.22 9.89l-.39.39a1.33 1.33 0 0 0-.39.94v.55a2.67 2.67 0 0 1-2.67 2.67h-.55c-.35 0-.69.14-.94.39l-.39.39a2.67 2.67 0 0 1-3.77 0l-.4-.39a1.33 1.33 0 0 0-.94-.39h-.55a2.67 2.67 0 0 1-2.67-2.67v-.55c0-.35-.14-.69-.39-.94l-.39-.39a2.67 2.67 0 0 1 0-3.77l.39-.39c.25-.25.39-.59.39-.94v-.55a2.67 2.67 0 0 1 2.67-2.67h.55c.35 0 .69-.14.94-.39l.4-.39a2.67 2.67 0 0 1 3.77 0l.39.39c.25.25.59.39.94.39h.55a2.67 2.67 0 0 1 2.67 2.67v.55c0 .35.14.69.39.94l.39.39a2.67 2.67 0 0 1 0 3.77Z" fill="#219FFC" />
              <path d="M8 3.95A4.05 4.05 0 1 0 8 12.05 4.05 4.05 0 0 0 8 3.95Zm-3.48 4.05c0-.4.07-.78.2-1.14.23 1.7 1.72 1.84 1.78 2.11.07.3 0 .39.03.92.03.52.75.52 1.03.94.08.12.13.38.11.63A3.49 3.49 0 0 1 4.52 8Zm4.42 3.35c.26-.8 1.03-1.08 1.11-1.54.06-.37-.43-.56-.87-.62-.43-.05-.37-.5-.68-.83-.31-.32-.51-.3-.94-.25-.44.05-.81.02-.93-.25-.12-.27.03-.4-.29-.73-.27-.28.02-.52.16-.55.23-.06.63.34.86.29.71-.15-.14-1.53.93-1.88.18-.06.36-.21.45-.39.6.13 1.15.42 1.6.83.12.35.2.75.13.96-.14.44-.5.76-.11 1.47.41.75.66.85.84.65.07-.08.17-.14.26-.18a3.5 3.5 0 0 1-2.52 3.02Z" fill="white" />
            </svg>
            <svg v-else class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M15.22 9.89l-.39.39a1.33 1.33 0 0 0-.39.94v.55a2.67 2.67 0 0 1-2.67 2.67h-.55c-.35 0-.69.14-.94.39l-.39.39a2.67 2.67 0 0 1-3.77 0l-.4-.39a1.33 1.33 0 0 0-.94-.39h-.55a2.67 2.67 0 0 1-2.67-2.67v-.55c0-.35-.14-.69-.39-.94l-.39-.39a2.67 2.67 0 0 1 0-3.77l.39-.39c.25-.25.39-.59.39-.94v-.55a2.67 2.67 0 0 1 2.67-2.67h.55c.35 0 .69-.14.94-.39l.4-.39a2.67 2.67 0 0 1 3.77 0l.39.39c.25.25.59.39.94.39h.55a2.67 2.67 0 0 1 2.67 2.67v.55c0 .35.14.69.39.94l.39.39a2.67 2.67 0 0 1 0 3.77Z" fill="#FAA135" />
              <path d="M5.6 5.64a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0Zm3.8 2.87c-.33-.24-.82-.47-1.4-.47H6.4c-1.62 0-2.2 1.19-2.2 2.21 0 .91.48 1.39 1.4 1.39h3.08c.06 0 .12-.05.12-.12v-1.05c0-.41.14-.74.4-.95v-.18c0-.3.07-.56.2-.83Zm2.8 1.96v.94c0 .42-.2.63-.6.63H10c-.4 0-.6-.21-.6-.63v-.94c0-.34.14-.54.4-.6v-.53a1 1 0 0 1 2 0v.53c.26.06.4.26.4.6Zm-1-1.13a.4.4 0 0 0-.8 0v.5h.8v-.5Z" fill="white" />
            </svg>
          </span>
        </div>
        <p class="m-0 mt-1 flex h-5 gap-3 text-sm text-grey-700">
          <span class="flex-none">{{ project.likes }} likes</span>
          <span class="block flex-auto truncate" :title="project.updatedAt">{{ project.updatedAt }}</span>
        </p>
      </div>
    </RouterLink>
  </li>
</template>
