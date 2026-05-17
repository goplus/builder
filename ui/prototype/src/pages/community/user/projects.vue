<script setup lang="ts">
import { computed, ref } from 'vue'

import { listUserProjects } from '@/apis/community'
import { getUserProfile, isSignedInUser } from '@/apis/user'
import ProjectCard from '@/components/project/ProjectCard.vue'
import UserContent from '@/components/community/user/UserContent.vue'
import PrototypeButton from '@/components/ui/PrototypeButton.vue'

const props = defineProps<{
  nameInput: string
}>()

const order = ref<'updated' | 'likes'>('updated')
const user = computed(() => getUserProfile(props.nameInput))
const projects = computed(() => {
  const items = [...listUserProjects(user.value.username)]
  return order.value === 'likes' ? items.sort((a, b) => b.likes - a.likes) : items
})
</script>

<template>
  <UserContent>
    <template #title>{{ isSignedInUser(user.username) ? 'My projects' : `${user.displayName}'s projects` }}</template>
    <template #extra>
      <span>Sort by</span>
      <PrototypeButton type="text" :active="order === 'updated'" @click="order = 'updated'">Recently updated</PrototypeButton>
      <PrototypeButton type="text" :active="order === 'likes'" @click="order = 'likes'">Most likes</PrototypeButton>
      <PrototypeButton v-if="isSignedInUser(user.username)" type="primary">New project</PrototypeButton>
    </template>
    <ul class="m-0 grid list-none grid-cols-4 gap-5 p-0 desktop-large:grid-cols-5">
      <ProjectCard v-for="project in projects" :key="project.id" :project="project" />
    </ul>
  </UserContent>
</template>
