<script setup lang="ts">
import { computed } from 'vue'

import { listUserLikes, listUserProjects } from '@/apis/community'
import { getUserProfile, isSignedInUser } from '@/apis/user'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import UserContent from '@/components/community/user/UserContent.vue'
import { getUserPageRoute } from '@/router'

const props = defineProps<{
  nameInput: string
}>()

const user = computed(() => getUserProfile(props.nameInput))
const projects = computed(() => listUserProjects(user.value.username).slice(0, 4))
const likes = computed(() => listUserLikes(user.value.username).slice(0, 4))
const projectTitle = computed(() => (isSignedInUser(user.value.username) ? 'My projects' : `${user.value.displayName}'s projects`))
const likesTitle = computed(() => (isSignedInUser(user.value.username) ? 'Projects I like' : `${user.value.displayName}'s likes`))
</script>

<template>
  <div class="flex flex-col gap-5">
    <UserContent>
      <template #title>{{ projectTitle }}</template>
      <template #extra>
        <RouterLink class="link-primary flex items-center text-lg" :to="getUserPageRoute(user.username, 'projects')">
          View all
          <svg class="ml-2 size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M13.9844 6.48491C14.2692 6.20044 14.731 6.20025 15.0156 6.48491L18.0156 9.48491C18.0418 9.51109 18.0646 9.53999 18.0859 9.56889C18.1335 9.63341 18.1719 9.70543 18.1963 9.78374L18.2158 9.86186C18.2339 9.95531 18.2326 10.0517 18.2139 10.1451C18.1911 10.2585 18.1411 10.362 18.0723 10.4498C18.0545 10.4724 18.0365 10.4953 18.0156 10.5162L15.0156 13.5162C14.731 13.8004 14.269 13.8004 13.9844 13.5162C13.7 13.2314 13.6998 12.7696 13.9844 12.4849L15.7383 10.73H2.5C2.09737 10.73 1.77063 10.4031 1.77051 10.0005C1.77071 9.59799 2.09742 9.27202 2.5 9.27202H15.7402L13.9844 7.51616C13.6996 7.23142 13.6997 6.76967 13.9844 6.48491Z" fill="currentColor" />
          </svg>
        </RouterLink>
      </template>
      <ProjectsSection title="" :projects="projects" context="user" :card-context="isSignedInUser(user.username) ? 'mine' : 'public'" />
    </UserContent>
    <UserContent>
      <template #title>{{ likesTitle }}</template>
      <template #extra>
        <RouterLink class="link-primary flex items-center text-lg" :to="getUserPageRoute(user.username, 'likes')">
          View all
          <svg class="ml-2 size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M13.9844 6.48491C14.2692 6.20044 14.731 6.20025 15.0156 6.48491L18.0156 9.48491C18.0418 9.51109 18.0646 9.53999 18.0859 9.56889C18.1335 9.63341 18.1719 9.70543 18.1963 9.78374L18.2158 9.86186C18.2339 9.95531 18.2326 10.0517 18.2139 10.1451C18.1911 10.2585 18.1411 10.362 18.0723 10.4498C18.0545 10.4724 18.0365 10.4953 18.0156 10.5162L15.0156 13.5162C14.731 13.8004 14.269 13.8004 13.9844 13.5162C13.7 13.2314 13.6998 12.7696 13.9844 12.4849L15.7383 10.73H2.5C2.09737 10.73 1.77063 10.4031 1.77051 10.0005C1.77071 9.59799 2.09742 9.27202 2.5 9.27202H15.7402L13.9844 7.51616C13.6996 7.23142 13.6997 6.76967 13.9844 6.48491Z" fill="currentColor" />
          </svg>
        </RouterLink>
      </template>
      <ProjectsSection title="" :projects="likes" context="user" />
    </UserContent>
  </div>
</template>
