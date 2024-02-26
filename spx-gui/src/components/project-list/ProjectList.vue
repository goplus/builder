<template>
  <n-modal v-model:show="showModal" preset="card" to="body" header-style="padding:11px 24px 11px 30%;"
    content-style="max-height:70vh;overflow:scroll;" :on-after-leave="closeModalFunc">
    <template #header>
      <div style="width: 30vw">
        <n-input v-model:value="searchQuery" size="large" placeholder="Search" round clearable
          @keydown.enter="search"></n-input>
      </div>
    </template>

    <n-grid v-if="projectList.length" cols="2 m:3 l:4 xl:5 2xl:6" x-gap="12" y-gap="12" responsive="screen">
      <n-grid-item v-for="project in projectList" :key="project.id">
        <ProjectCard :project="project" />
      </n-grid-item>
    </n-grid>

    <n-empty v-else description="There's nothing."></n-empty>
  </n-modal>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, onMounted, ref } from 'vue'
import { NModal, NGrid, NGridItem, NInput, NEmpty } from 'naive-ui'
import { Project, type ProjectSummary } from '@/class/project';
import ProjectCard from './ProjectCard.vue'
import { watch } from 'vue';

// ----------props & emit------------------------------------
const emits = defineEmits(['update:show'])
const showModal = ref<boolean>(false)
let projects: ProjectSummary[] = []
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})
watch(() => props.show, (newShow) => {
  showModal.value = newShow
})
const projectList = ref<ProjectSummary[]>([])

onMounted(async () => {
  projects = await Project.getProjects()
  projectList.value = projects
})

// ----------data related -----------------------------------
// Ref about search text.
const searchQuery = ref('')

// ----------methods-----------------------------------------
const closeModalFunc = () => {
  emits('update:show')
}
const search = () => {
  projectList.value = projects.filter((project) => project.title.includes(searchQuery.value))
}

</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.n-card {
  width: 80vw;

  .n-grid {
    padding: 12px;
    width: 100px;
    box-sizing: border-box;
  }
}
</style>
