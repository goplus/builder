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
      <ProjectsSection title="" link-text="View all" :link-to="getUserPageRoute(user.username, 'projects')" :projects="projects" context="user" />
    </UserContent>
    <UserContent>
      <template #title>{{ likesTitle }}</template>
      <ProjectsSection title="" link-text="View all" :link-to="getUserPageRoute(user.username, 'likes')" :projects="likes" context="user" />
    </UserContent>
  </div>
</template>
