<script setup lang="ts">
import { computed } from 'vue'

import { listUserLikes } from '@/apis/community'
import { getUserProfile, isSignedInUser } from '@/apis/user'
import ProjectCard from '@/components/project/ProjectCard.vue'
import UserContent from '@/components/community/user/UserContent.vue'

const props = defineProps<{
  nameInput: string
}>()

const user = computed(() => getUserProfile(props.nameInput))
const projects = computed(() => listUserLikes(user.value.username))
</script>

<template>
  <UserContent>
    <template #title>{{ isSignedInUser(user.username) ? 'Projects I like' : `${user.displayName}'s likes` }}</template>
    <ul class="m-0 grid list-none grid-cols-4 gap-5 p-0 desktop-large:grid-cols-5">
      <ProjectCard v-for="project in projects" :key="project.id" :project="project" />
    </ul>
  </UserContent>
</template>
