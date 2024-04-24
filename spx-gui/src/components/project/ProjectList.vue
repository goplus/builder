<template>
  <UILoading v-if="isLoading" />
  <UIError v-else-if="error != null" :retry="refetch">
    {{ $t(error.userMessage) }}
  </UIError>
  <UIEmpty v-else-if="projects?.data.length === 0" />
  <!-- TODO: infinite scrolling-like pagination -->
  <ul v-else :class="['project-list', { 'in-homepage': inHomepage }]">
    <ProjectItem
      v-for="project in projects?.data"
      :key="project.id"
      :in-homepage="inHomepage"
      :project="transformProjectDataToProject(project)"
      @click="() => emit('selected', project)"
    />
  </ul>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { UILoading, UIError, UIEmpty } from '@/components/ui'
import ProjectItem from './ProjectItem.vue'
import { listProject, type ProjectData } from '@/apis/project'
import { Project } from '@/models/project'
import { useQuery } from '@/utils/exception'
import { useUserStore } from '@/stores/user'

defineProps<{
  inHomepage?: boolean
}>()

const emit = defineEmits<{
  selected: [ProjectData]
}>()

const pageSize = 500
const pageIndex = ref(1)

const {
  isLoading,
  data: projects,
  error,
  refetch
} = useQuery(() => listProject({ pageSize, pageIndex: pageIndex.value }), {
  en: 'Failed to list project',
  zh: '获取项目列表失败'
})

const userStore = useUserStore()

// FIXME: slow zone
function transformProjectDataToProject(projectData: ProjectData) {
  if (userStore.userInfo == null) throw new Error('login required')
  let newProject = new Project()
  newProject.loadFromCloud(userStore.userInfo.name, projectData.name)
  return newProject
}
</script>

<style lang="scss" scoped>
.project-list {
  height: 570px;
  flex: 1 1 0;
  overflow-y: auto;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 12px;
}

.project-list.in-homepage {
  margin: 20px 24px;
  gap: 20px;
}
</style>
