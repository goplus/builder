<template>
  <div ref="projectList" class="project-list">
    <UIInfiniteScrollList
      v-model:items="projects"
      :item-size="itemSize"
      :gap="gap"
      :list-items="listProject"
    >
      <ProjectItem
        v-for="project in projects"
        :key="project.id"
        :in-homepage="inHomepage"
        :project-data="project"
        @click="() => emit('selected', project)"
      />
    </UIInfiniteScrollList>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { UIInfiniteScrollList } from '@/components/ui'
import ProjectItem, { projectItemSize, projectItemSizeInHomepage } from './ProjectItem.vue'
import { listProject, type ProjectData } from '@/apis/project'

const props = defineProps<{
  inHomepage?: boolean
}>()

const emit = defineEmits<{
  selected: [ProjectData]
}>()

const itemSize = computed(() => (props.inHomepage ? projectItemSizeInHomepage : projectItemSize))
const gap = computed(() => (props.inHomepage ? 20 : 12))
const projects = ref<ProjectData[]>([])
</script>

<style lang="scss" scoped>
.project-list {
  flex: 1 1 0;
  display: flex;
  margin-bottom: 20px;
}
</style>
