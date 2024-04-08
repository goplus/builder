<template>
  <div class="container">
    <div class="header">
      <n-button type="primary" @click="handleRerun">Rerun (TODO: i18n)</n-button>
      <n-button @click="handleShare">Share</n-button>
    </div>
    <ProjectRunner v-if="project" ref="projectRunnerRef" :project="project" class="runner" />
  </div>
</template>
<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import ProjectRunner from '../project-runner/ProjectRunner.vue'
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { Project } from '@/models/project'
import { useShareProject } from '@/components/project'

const route = useRoute()
const project = ref<Project>()
const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

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

    projectRunnerRef.value?.stop()
    projectRunnerRef.value?.run()
  },
  { deep: true, immediate: true }
)

const handleRerun = () => {
  projectRunnerRef.value?.stop()
  projectRunnerRef.value?.run()
}

const shareProject = useShareProject()

const handleShare = () => {
  if (project.value == null) return
  shareProject(project.value)
}
</script>
<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
}
.header {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}
.runner {
  flex: 1;
}
</style>
