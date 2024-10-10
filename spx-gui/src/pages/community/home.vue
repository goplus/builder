<template>
  <CenteredWrapper>
    <h1>Public</h1>
    <ul v-if="projects != null" class="projects">
      <ProjectItem
        v-for="project in projects"
        :key="project.id"
        :project="project"
        context="public"
      ></ProjectItem>
    </ul>
    <h1>Mine</h1>
    <ul v-if="projects != null" class="projects">
      <ProjectItem
        v-for="project in projects"
        :key="project.id"
        :project="project"
        context="mine"
      ></ProjectItem>
    </ul>
    <h1>To Edit</h1>
    <ul v-if="projects != null" class="projects">
      <ProjectItem
        v-for="project in projects"
        :key="project.id"
        :project="project"
        context="edit"
      ></ProjectItem>
    </ul>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import { useQuery } from '@/utils/exception'
import { listProject } from '@/apis/project'
import ProjectItem from '@/components/project/item/ProjectItem.vue'

const { data: projects } = useQuery(
  async () => {
    const { data: projects } = await listProject()
    return projects.slice(0, 4)
  },
  { en: 'Failed to load projects', zh: '加载项目失败' }
)
</script>

<style lang="scss" scoped>
.projects {
  padding: 20px 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 20px;
}
</style>
