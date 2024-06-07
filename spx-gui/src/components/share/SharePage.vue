<template>
  <RunnerContainer v-if="project != null" mode="share" :project="project" />
  <UILoading :visible="project == null" cover />
</template>
<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { ref } from 'vue'
import { Project } from '@/models/project'
import RunnerContainer from '../project/runner/RunnerContainer.vue'
import { UILoading } from '../ui'

const route = useRoute()
const project = ref<Project>()

watch(
  () => {
    const owner = route.params.owner as string
    const name = route.params.name as string
    return { owner, name }
  },
  async ({ owner, name }) => {
    if (!owner || !name) return
    const newProject = new Project()
    await newProject.loadFromCloud(owner, name)
    project.value = newProject
  },
  { deep: true, immediate: true }
)
</script>
