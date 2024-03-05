<template>
  <n-modal v-model:show="showModal" preset="card" to="body" header-style="padding:11px 24px 11px 30%;"
    content-style="overflow-y: scroll;" :on-after-leave="closeModalFunc">
    <template #header>
      <div style="width: 30vw">
        <n-input v-model:value="searchQuery" size="large" placeholder="Search" round clearable></n-input>
      </div>
    </template>

    <n-tabs v-model:value="state.currentTab" justify-content="space-evenly" size="large" @update:value="onTabChange">
      <n-tab-pane v-for="item in state.tabs" :key="item" :name="item">
      </n-tab-pane>
    </n-tabs>

    <div class="container">
        <n-grid v-if="currentList.length" cols="2 m:3 l:3 xl:4 2xl:5" x-gap="10" y-gap="15" responsive="screen">
          <n-grid-item v-for="project in currentList" :key="project.id">
            <ProjectCard :project="project" @load-project="closeModalFunc"/>
          </n-grid-item>
        </n-grid>
        <n-empty v-else description="There's nothing."></n-empty>
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import {computed, type ComputedRef, defineEmits, defineProps, onMounted, reactive, ref, watch} from 'vue'
import {NEmpty, NGrid, NGridItem, NInput, NModal, NTabPane, NTabs} from 'naive-ui'
import {Project, type ProjectSummary} from '@/class/project';
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
enum TabEnum {
  local = 'Local',
  cloud = 'Cloud',
  public = 'Public'
}

const showModal = ref<boolean>(false)
const searchQuery = ref('')
const projectList = ref<ProjectSummary[]>([])
const currentList: ComputedRef<ProjectSummary[]> = computed(() => {
  return projectList.value.filter(project => project.name?.includes(searchQuery.value))
})

const state = reactive({
  tabs: TabEnum,
  currentTab: TabEnum.local,
})
// const activeTab = state.tabs[0]

const onTabChange = (index: TabEnum) => {
  // Reset search query when switching sources
  searchQuery.value = ''
  state.currentTab = index
  getProjects()
}

watch(() => props.show, (newShow) => {
  showModal.value = newShow
  if (newShow) getProjects()
})

onMounted( () => {
  getProjects()
})

// ----------methods-----------------------------------------
const closeModalFunc = () => {
  emits('update:show')
}

const getProjects = async () => {
  const type = state.currentTab
  if (type == TabEnum.local) {
    projectList.value = await Project.getLocalProjects()
  }else if (type == TabEnum.cloud) {
    projectList.value = await Project.getCloudProjects(1, 300, true)
  } else {
    projectList.value = await Project.getCloudProjects(1, 300, false)
  }
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
