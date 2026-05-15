<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { getUserProfile, listUserProjects } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'

const props = defineProps<{
  nameInput: string
}>()

const user = computed(() => getUserProfile(props.nameInput))
const projects = computed(() => listUserProjects(props.nameInput))

onMounted(() => {
  document.title = `${user.value.displayName} - XBuilder`
})
</script>

<template>
  <main>
    <div class="h-48 overflow-hidden bg-grey-400">
      <img class="size-full object-cover" :src="user.cover" alt="" />
    </div>

    <CenteredWrapper class="-mt-12 pb-10">
      <section class="rounded-lg border border-grey-400 bg-grey-100 p-6">
        <div class="flex items-end gap-5">
          <img class="size-24 rounded-full border-4 border-grey-100 object-cover shadow-sm" :src="user.avatar" alt="" />
          <div class="pb-2">
            <h1 class="m-0 text-2xl font-medium text-title">{{ user.displayName }}</h1>
            <p class="mt-1 text-sm text-hint-1">@{{ user.username }} · {{ user.joinedAt }}</p>
          </div>
        </div>
        <p class="mt-5 max-w-180 text-sm leading-6 text-text">{{ user.bio }}</p>
        <div class="mt-4 flex gap-6 text-sm text-hint-2">
          <span>{{ user.followers }} followers</span>
          <span>{{ user.following }} following</span>
          <span>{{ user.location }}</span>
        </div>
      </section>

      <nav class="mt-5 flex gap-2 border-b border-grey-400">
        <RouterLink class="px-4 py-3 text-sm text-title no-underline hover:bg-grey-200" :to="`/user/${user.username}`">Overview</RouterLink>
        <RouterLink class="px-4 py-3 text-sm text-title no-underline hover:bg-grey-200" :to="`/user/${user.username}/projects`">Projects</RouterLink>
        <RouterLink class="px-4 py-3 text-sm text-title no-underline hover:bg-grey-200" :to="`/user/${user.username}/likes`">Likes</RouterLink>
        <RouterLink class="px-4 py-3 text-sm text-title no-underline hover:bg-grey-200" :to="`/user/${user.username}/followers`">Followers</RouterLink>
        <RouterLink class="px-4 py-3 text-sm text-title no-underline hover:bg-grey-200" :to="`/user/${user.username}/following`">Following</RouterLink>
      </nav>

      <ul class="mt-5 grid list-none grid-cols-4 gap-5 p-0">
        <ProjectCard v-for="project in projects" :key="project.id" :project="project" />
      </ul>
    </CenteredWrapper>
  </main>
</template>
