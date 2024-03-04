<template>
  <n-modal v-model:show="showModal" preset="card" to="body" header-style="padding:11px 24px 11px 30%;"
    content-style="overflow-y: scroll;" :on-after-leave="closeModalFunc">
    <template #header>
      <div style="width: 30vw">
        <n-input v-model:value="searchQuery" size="large" placeholder="Search" round clearable></n-input>
      </div>
    </template>

    <n-tabs v-model:value="currentSource" default-value="local" justify-content="space-evenly" size="large">
      <n-tab-pane name="local" tab="Local">
      </n-tab-pane>
      <n-tab-pane name="cloud" tab="Cloud">
      </n-tab-pane>
      <n-tab-pane name="public" tab="Public">
      </n-tab-pane>
    </n-tabs>

    <div class="container">
        <n-grid v-if="projectList.length" cols="2 m:3 l:3 xl:4 2xl:5" x-gap="10" y-gap="15" responsive="screen">
          <n-grid-item v-for="project in projectList" :key="project.id">
            <ProjectCard :project="project" @load-project="closeModalFunc"/>
          </n-grid-item>
        </n-grid>
        <n-empty v-else description="There's nothing."></n-empty>
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import {defineEmits, defineProps, onMounted, ref, watch} from 'vue'
import {NEmpty, NGrid, NGridItem, NInput, NModal, NTabPane, NTabs} from 'naive-ui'
import {Project, ProjectSource, type ProjectSummary} from '@/class/project';
import ProjectCard from './ProjectCard.vue'

// ----------props & emit------------------------------------
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})
const emits = defineEmits(['update:show'])

// ----------data related -----------------------------------
// Ref about search text.
const showModal = ref<boolean>(false)
const currentSource = ref<ProjectSource>(ProjectSource.local)
const searchQuery = ref('')
const projectList = ref<ProjectSummary[]>([])

watch(() => props.show, (newShow) => {
  showModal.value = newShow
  if (newShow) getProjects()
})

watch(currentSource, () => {
  // Reset search query when switching sources
  searchQuery.value = ''
  getProjects()
})

watch(searchQuery, async () => {
  await getProjects()
  projectList.value = projectList.value.filter(project => project.name?.includes(searchQuery.value))
})

onMounted( () => {
  getProjects()
})

// ----------methods-----------------------------------------
const closeModalFunc = () => {
  emits('update:show')
}

const getProjects = async () => {
  projectList.value = await Project.getProjects(currentSource.value)
}

</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.n-modal {
  width: 80vw;
  overflow: hidden;

  .n-grid {
    padding: 12px;
    width: 100px;
    box-sizing: border-box;
  }

  .container{
    height:70vh;
  }
}
</style>
