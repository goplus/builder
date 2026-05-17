<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getProject, getProjectEditorRoute, listRelatedProjects } from '@/apis/project'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import TextView from '@/components/common/TextView.vue'
import PrototypeProjectRunner from '@/components/project/PrototypeProjectRunner.vue'
import PrototypeButton from '@/components/ui/PrototypeButton.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'
import { humanizeCount } from '@/utils/format'
import { getProjectPageRoute, getUserPageRoute } from '@/router'

const props = defineProps<{
  ownerInput: string
  nameInput: string
}>()

const copied = ref(false)
const project = computed(() => getProject(props.ownerInput, props.nameInput))
const relatedProjects = computed(() => listRelatedProjects(project.value))

function copyShareLink() {
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

onMounted(() => {
  document.title = `${project.value.title} - XBuilder`
})
</script>

<template>
  <main class="bg-grey-300">
    <CenteredWrapper class="pt-6 pb-10" size="large">
      <PrototypeCard class="flex gap-10 bg-grey-100 p-5">
        <section class="min-w-0 flex-[1_1_744px]">
          <div class="aspect-[4/3] overflow-hidden rounded-md bg-grey-1000">
            <PrototypeProjectRunner :project="project" :show-controls="false" />
          </div>
          <div class="mt-3 flex justify-end gap-3">
            <PrototypeButton class="size-9 px-0" aria-label="Share project" @click="copyShareLink">
              <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 fill-current">
                <path d="M14.2 12.1a2.9 2.9 0 0 0-2.18.99L7.7 10.7a3.05 3.05 0 0 0 0-1.39l4.24-2.35a2.9 2.9 0 1 0-.68-1.22L7.02 8.09a2.9 2.9 0 1 0 0 3.82l4.32 2.39a2.9 2.9 0 1 0 2.86-2.2Z" />
              </svg>
            </PrototypeButton>
          </div>
        </section>

        <aside class="flex min-w-0 flex-[1_1_456px] flex-col pr-5">
          <h1 class="m-0 break-all text-2xl/[1.4] font-normal text-title">{{ project.title }}</h1>
          <RouterLink
            v-if="project.remixedFrom"
            class="mt-2 inline-flex text-sm text-primary-600 no-underline hover:underline"
            :to="getProjectPageRoute(project.remixedFrom.owner, project.remixedFrom.name)"
          >
            Remixed from {{ project.remixedFrom.title }}
          </RouterLink>

          <div class="mt-4 flex items-center justify-between gap-4">
            <RouterLink class="flex min-w-0 items-center gap-3 text-text no-underline" :to="getUserPageRoute(project.owner.username)">
              <img class="size-10 flex-none rounded-full border border-grey-300 object-cover" :src="project.owner.avatar" alt="" />
              <span class="min-w-0">
                <span class="block truncate text-base text-title">{{ project.owner.displayName }}</span>
                <span class="block truncate text-sm text-hint-1">@{{ project.owner.username }}</span>
              </span>
            </RouterLink>

            <p class="m-0 flex flex-none items-center gap-2 text-sm text-hint-2">
              <span class="flex items-center gap-1" :title="`${project.views} views`">
                <svg aria-hidden="true" viewBox="0 0 20 20" class="size-3.5 fill-current">
                  <path d="M10 4.2c4 0 6.7 3.56 7.55 4.87.36.56.36 1.3 0 1.86C16.7 12.24 14 15.8 10 15.8s-6.7-3.56-7.55-4.87a1.72 1.72 0 0 1 0-1.86C3.3 7.76 6 4.2 10 4.2Zm0 2.7a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm0 1.4a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" />
                </svg>
                {{ humanizeCount(project.views) }}
              </span>
              <i class="h-3 w-px bg-dividing-line-1"></i>
              <span class="flex items-center gap-1" :title="`Remixed ${project.remixes} times`">
                <svg aria-hidden="true" viewBox="0 0 20 20" class="size-3.5 fill-current">
                  <path d="M5.3 4.2h5.2a4.2 4.2 0 0 1 4.2 4.2v.6l1.12-1.12a.8.8 0 1 1 1.13 1.13l-2.48 2.48a.8.8 0 0 1-1.13 0l-2.48-2.48A.8.8 0 1 1 12 7.88L13.1 9v-.6a2.6 2.6 0 0 0-2.6-2.6H5.3a.8.8 0 1 1 0-1.6Zm-.9 4.3a.8.8 0 0 1 1.13 0l2.48 2.48a.8.8 0 0 1 0 1.13l-2.48 2.48a.8.8 0 0 1-1.13-1.13l1.1-1.1v-.76a2.6 2.6 0 0 0 2.6 2.6h5.2a.8.8 0 1 1 0 1.6H8.1a4.2 4.2 0 0 1-4.2-4.2v-.76l-1.1 1.1a.8.8 0 0 1-1.13-1.13L4.15 8.5a.8.8 0 0 1 .25 0Z" />
                </svg>
                {{ humanizeCount(project.remixes) }}
              </span>
            </p>
          </div>

          <div class="mt-4 flex gap-3">
            <RouterLink
              class="inline-flex h-10 flex-[1_1_0] items-center justify-center gap-2 rounded-sm border border-transparent bg-primary-500 px-3 text-sm font-medium text-white no-underline hover:bg-primary-600"
              :to="getProjectEditorRoute(project)"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 fill-current">
                <path d="M13.8 2.8a1.7 1.7 0 0 1 2.4 2.4L6.9 14.5l-3.3.9.9-3.3 9.3-9.3ZM3.6 16.3h12.8a.8.8 0 0 1 0 1.6H3.6a.8.8 0 0 1 0-1.6Z" />
              </svg>
              Edit
            </RouterLink>
            <PrototypeButton class="h-10 flex-[1_1_0]" @click="copyShareLink">
              <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 fill-current">
                <path d="M14.2 12.1a2.9 2.9 0 0 0-2.18.99L7.7 10.7a3.05 3.05 0 0 0 0-1.39l4.24-2.35a2.9 2.9 0 1 0-.68-1.22L7.02 8.09a2.9 2.9 0 1 0 0 3.82l4.32 2.39a2.9 2.9 0 1 0 2.86-2.2Z" />
              </svg>
              {{ copied ? 'Link copied' : 'Share' }}
            </PrototypeButton>
          </div>

          <div class="mt-6 mb-4 h-px bg-dividing-line-1"></div>

          <div class="mb-2 min-h-0 flex-[1_1_0] overflow-y-auto">
            <details class="border-b border-grey-300 py-3" open>
              <summary class="cursor-pointer text-base text-title">Description</summary>
              <TextView class="mt-3" :text="project.description" placeholder="No description yet." />
            </details>
            <details class="border-b border-grey-300 py-3" open>
              <summary class="cursor-pointer text-base text-title">Play instructions</summary>
              <TextView class="mt-3" :text="project.instructions" placeholder="No instructions yet." />
            </details>
            <details v-if="project.releaseHistory?.length" class="border-b border-grey-300 py-3" open>
              <summary class="cursor-pointer text-base text-title">Release history</summary>
              <ol class="m-0 mt-3 list-none p-0">
                <li v-for="release in project.releaseHistory" :key="release.id" class="py-2">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-title">{{ release.version }}</span>
                    <span class="text-sm text-hint-1">{{ release.createdAt }}</span>
                  </div>
                  <p class="mt-1 text-sm leading-5 text-grey-700">{{ release.notes }}</p>
                </li>
              </ol>
            </details>
          </div>
        </aside>
      </PrototypeCard>

      <ProjectsSection class="mt-5" title="Popular remixes" :projects="relatedProjects" context="project" />
    </CenteredWrapper>
  </main>
</template>
