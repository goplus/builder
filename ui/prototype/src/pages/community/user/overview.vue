<script setup lang="ts">
import { computed } from 'vue'

import { listUserLikes, listUserProjects } from '@/apis/community'
import { getUserProfile, isSignedInUser } from '@/apis/user'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import UICard from '@/components/ui/UICard.vue'
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
    <UICard class="px-4">
      <ProjectsSection
        :title="projectTitle"
        link-text="View all"
        :link-to="getUserPageRoute(user.username, 'projects')"
        :projects="projects"
        context="user"
        :card-context="isSignedInUser(user.username) ? 'mine' : 'public'"
      />
    </UICard>
    <UICard class="px-4">
      <ProjectsSection
        :title="likesTitle"
        link-text="View all"
        :link-to="getUserPageRoute(user.username, 'likes')"
        :projects="likes"
        context="user"
      />
    </UICard>
  </div>
</template>
