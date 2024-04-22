<template>
  <UIFormModal
    :title="$t({ en: 'Open project', zh: '打开项目' })"
    :style="{ width: '960px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UILoading v-if="isLoading" />
    <!-- TODO: replace this with a component -->
    <div v-else-if="error != null">
      {{ $t(error.userMessage) }}
      <UIButton type="boring" size="small" @click="refetch">
        {{ $t({ en: 'Refresh', zh: '刷新' }) }}
      </UIButton>
    </div>
    <!-- TODO: infinite scrolling-like pagination -->
    <ul v-else class="project-list">
      <ProjectItem
        v-for="project in projects?.data"
        :key="project.id"
        :project="transformProjectDataToProject(project)"
        @click="() => emit('resolved', project)"
      />
    </ul>
  </UIFormModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { UIFormModal, UIButton, UILoading } from '@/components/ui'
import ProjectItem from './ProjectItem.vue'
import { listProject, type ProjectData } from '@/apis/project'
import { Project } from '@/models/project'
import { useQuery } from '@/utils/exception'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [ProjectData]
}>()

function handleCancel() {
  emit('cancelled')
}

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
  margin: 0 0 20px 12px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 12px;
}
</style>
