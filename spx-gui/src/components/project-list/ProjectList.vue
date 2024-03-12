<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    to="body"
    header-style="padding:11px 24px 11px 30%;"
    :on-after-leave="closeModalFunc"
  >
    <template #header>
      <div style="width: 30vw">
        <n-input v-model:value="searchQuery" size="large" :placeholder="$t('project.search')" round clearable></n-input>
      </div>
    </template>

    <n-tabs
      v-model:value="state.currentTab"
      animated
      justify-content="space-evenly"
      size="large"
      @update:value="onTabChange"
    >
      <!-- No other tabs can be switched until the request is finished -->
      <n-tab-pane
        v-for="item in state.tabs"
        :key="item"
        :name="item"
        :label="$t(`project.${item.toLowerCase()}`)"
        :disabled="isRequesting && state.currentTab !== item || (networkStore.offline() && item != TabEnum.local)"
      >
        <div class="container">
          <n-space v-if="isRequesting" justify="center">
            <n-spin size="large"/>
          </n-space>
          <n-grid
            v-else-if="currentList.length"
            cols="1 s:2 m:3 l:3 xl:4 2xl:5" x-gap="35"
            y-gap="20"
            responsive="screen"
          >
            <n-grid-item v-for="project in currentList" :key="project.id">
              <TransitionGroup name="list">
                <ProjectCard
                  :project="project"
                  @load-project="closeModalFunc"
                  @remove-project="removeProject(project.id)"/>
              </TransitionGroup>
            </n-grid-item>
          </n-grid>
          <n-empty v-else :description="$t('project.nothing')"></n-empty>
        </div>
      </n-tab-pane>
    </n-tabs>
  </n-modal>
</template>

<script lang="ts" setup>
import { computed, type ComputedRef, defineEmits, defineProps, onMounted, reactive, ref, watch } from 'vue'
import { NEmpty, NGrid, NGridItem, NInput, NModal, NTabPane, NTabs, NSpin, NSpace } from 'naive-ui'
import { Project, type ProjectSummary } from '@/class/project';
import { useNetworkStore } from "@/store/modules/network";
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
enum TabEnum {
  local = 'Local',
  cloud = 'Cloud',
  public = 'Public'
}

const showModal = ref<boolean>(false)
const searchQuery = ref('')
const isRequesting = ref<boolean>(false)
const projectList = ref<ProjectSummary[]>([])
const currentList: ComputedRef<ProjectSummary[]> = computed(() => {
  return projectList.value.filter(project => project.name?.includes(searchQuery.value) || project.id.includes(searchQuery.value)).sort((a, b) => new Date(b.uTime).getTime() - new Date(a.uTime).getTime())
})
const networkStore = useNetworkStore()

const state = reactive({
  tabs: TabEnum,
  currentTab: TabEnum.local,
})

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

onMounted(() => {
  getProjects()
})

// ----------methods-----------------------------------------
const closeModalFunc = () => {
  emits('update:show')
}

const getProjects = async () => {
  if (isRequesting.value) return
  isRequesting.value = true
  const type = state.currentTab
  projectList.value = []
  try {
    if (type === TabEnum.local) {
      projectList.value = await Project.getLocalProjects()
    } else if (type === TabEnum.cloud) {
      projectList.value = await Project.getCloudProjects()
    } else {
      projectList.value = await Project.getCloudProjects(Project.ALL_USER)
    }
    isRequesting.value = false
  } catch (e) {
    if (e instanceof Error) {
      console.error(e)
      isRequesting.value = false
    }
  }
}

const removeProject = (id: string) => {
  projectList.value = projectList.value.filter(project => project.id !== id)
}

</script>

<style lang="scss" scoped>
.n-modal {
  width: 80vw;
  overflow: hidden;

  .n-tabs :deep(.n-tabs-pane-wrapper) {
    overflow-y: auto;

    .n-tab-pane {
      padding: 0 20px;
      width: 100%;
      box-sizing: border-box;
    }
  }

  .container {
    height: 70vh;

    .n-grid {
      padding: 12px 12px 24px;
      box-sizing: border-box;

      .list-move,
      .list-enter-active,
      .list-leave-active {
        transition: all 0.5s ease;
      }

      .list-enter-from,
      .list-leave-to {
        opacity: 0;
      }

      .list-leave-active {
        position: absolute;
      }
    }
  }
}
</style>
