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

const liked = ref(false)
const copied = ref(false)
const project = computed(() => getProject(props.ownerInput, props.nameInput))
const likeCount = computed(() => project.value.likes + (liked.value ? 1 : 0))
const relatedProjects = computed(() => listRelatedProjects(project.value))

function toggleLike() {
  liked.value = !liked.value
}

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
    <CenteredWrapper class="grid grid-cols-[minmax(0,1fr)_340px] gap-8 pt-8 pb-10" size="large">
      <section class="flex min-w-0 flex-col gap-5">
        <PrototypeCard class="overflow-hidden">
          <div class="aspect-video bg-grey-1000">
            <PrototypeProjectRunner :project="project" />
          </div>
          <div class="flex items-center justify-between border-t border-grey-300 p-4">
            <div class="flex items-center gap-4 text-sm text-hint-1">
              <span :title="`${project.views} views`">{{ humanizeCount(project.views) }} views</span>
              <span>{{ project.updatedAt }}</span>
            </div>
            <div class="flex gap-2">
              <PrototypeButton :active="liked" @click="toggleLike">
                {{ liked ? 'Liked' : 'Like' }}
              </PrototypeButton>
              <PrototypeButton @click="copyShareLink">
                {{ copied ? 'Link copied' : 'Share' }}
              </PrototypeButton>
              <RouterLink
                class="inline-flex h-9 items-center justify-center rounded-sm bg-primary-500 px-3 text-sm font-medium text-white no-underline hover:bg-primary-600"
                :to="getProjectEditorRoute(project)"
              >
                See inside
              </RouterLink>
            </div>
          </div>
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <h2 class="m-0 text-xl font-normal text-title">Instructions</h2>
          <TextView class="mt-3" :text="project.instructions" placeholder="No instructions yet." />
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <h2 class="m-0 text-xl font-normal text-title">Description</h2>
          <TextView class="mt-3" :text="project.description" placeholder="No description yet." />
        </PrototypeCard>

        <PrototypeCard v-if="project.remixedFrom" class="p-5">
          <h2 class="m-0 text-xl font-normal text-title">Remixed from</h2>
          <RouterLink
            class="mt-3 inline-flex text-primary-600 no-underline hover:underline"
            :to="getProjectPageRoute(project.remixedFrom.owner, project.remixedFrom.name)"
          >
            {{ project.remixedFrom.title }} by {{ project.remixedFrom.owner }}
          </RouterLink>
        </PrototypeCard>

        <PrototypeCard v-if="project.releaseHistory?.length" class="p-5">
          <h2 class="m-0 text-xl font-normal text-title">Release history</h2>
          <ol class="m-0 mt-4 list-none p-0">
            <li
              v-for="release in project.releaseHistory"
              :key="release.id"
              class="border-t border-grey-300 py-3 first:border-t-0 first:pt-0"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-title">{{ release.version }}</span>
                <span class="text-sm text-hint-1">{{ release.createdAt }}</span>
              </div>
              <p class="mt-1 text-sm leading-5 text-grey-700">{{ release.notes }}</p>
            </li>
          </ol>
        </PrototypeCard>

        <ProjectsSection title="More projects" :projects="relatedProjects" context="project" />
      </section>

      <aside class="flex flex-col gap-5">
        <PrototypeCard class="p-5">
          <h1 class="m-0 text-2xl font-medium text-title">{{ project.title }}</h1>
          <RouterLink class="mt-4 flex items-center gap-3 text-text no-underline" :to="getUserPageRoute(project.owner.username)">
            <img class="size-11 rounded-full border border-grey-300 object-cover" :src="project.owner.avatar" alt="" />
            <span>
              <span class="block text-base text-title">{{ project.owner.displayName }}</span>
              <span class="block text-sm text-hint-1">@{{ project.owner.username }}</span>
            </span>
          </RouterLink>
          <div class="mt-5 flex flex-wrap gap-2">
            <span v-for="tag in project.tags" :key="tag" class="rounded-full bg-grey-300 px-3 py-1 text-xs text-hint-2">
              {{ tag }}
            </span>
          </div>
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <dl class="m-0 grid grid-cols-3 gap-3 text-center">
            <div>
              <dt class="text-xs text-hint-1">Likes</dt>
              <dd class="m-0 mt-1 text-lg text-title">{{ humanizeCount(likeCount) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-hint-1">Remixes</dt>
              <dd class="m-0 mt-1 text-lg text-title">{{ humanizeCount(project.remixes) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-hint-1">Views</dt>
              <dd class="m-0 mt-1 text-lg text-title">{{ humanizeCount(project.views) }}</dd>
            </div>
          </dl>
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <h2 class="m-0 text-base font-medium text-title">Owner</h2>
          <p class="mt-2 text-sm leading-5 text-grey-700">{{ project.owner.bio }}</p>
          <p class="mt-3 text-sm text-hint-1">{{ project.owner.location }} · {{ project.owner.joinedAt }}</p>
        </PrototypeCard>
      </aside>
    </CenteredWrapper>
  </main>
</template>
